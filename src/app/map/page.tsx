'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { KakaoMap } from '@/components/map/kakao-map'
import { Venue, VenueWithFilterData } from '@/types/venue'
import { VenueFilters, DEFAULT_FILTERS, meetsGPUTier, isVenueOpen, is24Hour, OperatingHours } from '@/types/filters'
import { FilterPanel } from '@/components/filter/filter-panel'

const SEOUL_CENTER = { lat: 37.5665, lng: 126.9780 }
const MAP_CENTER_FETCH_DEBOUNCE_MS = 300
const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 300000,
} as const

export default function MapPage() {
  const router = useRouter()
  const [venues, setVenues] = useState<VenueWithFilterData[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [mapCenter, setMapCenter] = useState(SEOUL_CENTER)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<VenueFilters>(DEFAULT_FILTERS)
  const [isInitialCenterResolved, setIsInitialCenterResolved] = useState(false)
  const latestRequestIdRef = useRef(0)

  const requestUserLocation = useCallback((markInitialCenterResolved: boolean) => {
    return new Promise<boolean>((resolve) => {
      if (!navigator.geolocation) {
        if (markInitialCenterResolved) {
          setIsInitialCenterResolved(true)
        }

        resolve(false)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          const userLoc = { lat: latitude, lng: longitude }

          setUserLocation(userLoc)
          setMapCenter(userLoc)

          if (markInitialCenterResolved) {
            setIsInitialCenterResolved(true)
          }

          resolve(true)
        },
        () => {
          if (markInitialCenterResolved) {
            setIsInitialCenterResolved(true)
          }

          resolve(false)
        },
        GEOLOCATION_OPTIONS
      )
    })
  }, [])

  const fetchVenues = async (lat: number, lng: number, radiusMeters: number = 5000) => {
    const requestId = latestRequestIdRef.current + 1
    latestRequestIdRef.current = requestId
    setLoading(true)
    setError(null)
    const supabase = createClient()
    
    try {
      // Fetch venues with nearby_venues RPC
      const { data: venuesData, error: venuesError } = await supabase.rpc('nearby_venues', {
        user_lat: lat,
        user_lng: lng,
        radius_meters: radiusMeters,
        limit_count: 100 // Fetch more venues to allow filtering
      })

      if (venuesError) throw venuesError
      
      const venueList = (venuesData || []) as Venue[]
      
      if (requestId !== latestRequestIdRef.current) {
        return
      }

      if (venueList.length === 0) {
        setVenues([])
        return
      }

      const venueIds = venueList.map(v => v.id)

      const [pricingRes, specsRes, peripheralsRes] = await Promise.all([
        supabase.from('venue_pricing').select('venue_id, tier_name, pricing_structure').in('venue_id', venueIds),
        supabase.from('venue_specs').select('venue_id, cpu, gpu, ram_gb, storage, monitor, internet_speed_mbps').in('venue_id', venueIds),
        supabase.from('venue_peripherals').select('venue_id, peripheral_type, brand, model').in('venue_id', venueIds)
      ])

      const pricingByVenue = new Map<string, { tier_name: string; pricing_structure: Record<string, unknown> }[]>()
      for (const pricing of pricingRes.data || []) {
        if (!pricingByVenue.has(pricing.venue_id)) {
          pricingByVenue.set(pricing.venue_id, [])
        }
        pricingByVenue.get(pricing.venue_id)!.push({
          tier_name: pricing.tier_name,
          pricing_structure: pricing.pricing_structure as Record<string, unknown>
        })
      }

      const specsByVenue = new Map<string, { cpu: string; gpu: string; ram_gb: number; storage: string; monitor: string; internet_speed_mbps?: number }>()
      for (const spec of specsRes.data || []) {
        specsByVenue.set(spec.venue_id, {
          cpu: spec.cpu,
          gpu: spec.gpu,
          ram_gb: spec.ram_gb,
          storage: spec.storage,
          monitor: spec.monitor,
          internet_speed_mbps: spec.internet_speed_mbps ?? undefined
        })
      }

      const peripheralsByVenue = new Map<string, { peripheral_type: string; brand: string; model?: string }[]>()
      for (const peripheral of peripheralsRes.data || []) {
        if (!peripheralsByVenue.has(peripheral.venue_id)) {
          peripheralsByVenue.set(peripheral.venue_id, [])
        }
        peripheralsByVenue.get(peripheral.venue_id)!.push({
          peripheral_type: peripheral.peripheral_type,
          brand: peripheral.brand,
          model: peripheral.model ?? undefined
        })
      }

      if (requestId !== latestRequestIdRef.current) {
        return
      }

      const venuesWithData = venueList.map(venue => ({
        ...venue,
        pricing: pricingByVenue.get(venue.id) || [],
        specs: specsByVenue.get(venue.id) || null,
        peripherals: peripheralsByVenue.get(venue.id) || []
      } as VenueWithFilterData))
      
      setVenues(venuesWithData)
    } catch {
      if (requestId === latestRequestIdRef.current) {
        setError('주변 PC방을 불러오는데 실패했습니다.')
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    void requestUserLocation(true)
  }, [requestUserLocation])

  const handleRequestUserLocation = useCallback(async () => {
    return requestUserLocation(false)
  }, [requestUserLocation])

  const handleCenterChanged = useCallback((center: { lat: number; lng: number }) => {
    setMapCenter((currentCenter) => {
      if (currentCenter.lat === center.lat && currentCenter.lng === center.lng) {
        return currentCenter
      }

      return center
    })
  }, [])

  useEffect(() => {
    if (!isInitialCenterResolved) return

    const timeoutId = window.setTimeout(() => {
      fetchVenues(mapCenter.lat, mapCenter.lng, filters.distance)
    }, MAP_CENTER_FETCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [filters.distance, isInitialCenterResolved, mapCenter.lat, mapCenter.lng])

  // Apply filters to venues (client-side filtering for non-distance filters)
  const filteredVenues = useMemo(() => {
    return venues.filter(venue => {
      // Price filter: Check if ANY pricing tier has hourly price <= maxPrice
      if (filters.maxPrice !== null && venue.pricing) {
        const hasMatchingPrice = venue.pricing.some(pricing => {
          if (!pricing.pricing_structure) return false
          const hourlyPrices = Object.values(pricing.pricing_structure)
            .filter((value): value is number => typeof value === 'number')
          return hourlyPrices.some(price => price <= filters.maxPrice!)
        })
        if (!hasMatchingPrice) return false
      }
      
      // GPU filter
      if (filters.gpuTier !== null && venue.specs) {
        if (!meetsGPUTier(venue.specs.gpu, filters.gpuTier)) return false
      }
      
      // Peripheral filter: Check if ANY peripheral matches selected brands
      if (filters.peripheralBrands.length > 0 && venue.peripherals) {
        const validBrands: string[] = filters.peripheralBrands
        const hasMatchingPeripheral = venue.peripherals.some(peripheral =>
          validBrands.includes(peripheral.brand)
        )
        if (!hasMatchingPeripheral) return false
      }
      
      // Operating hours filters
      if (filters.onlyOpen) {
        if (!isVenueOpen(venue.operating_hours as OperatingHours | null | undefined)) return false
      }
      
      if (filters.only24Hours) {
        if (!is24Hour(venue.operating_hours as OperatingHours | null | undefined)) return false
      }
      
      return true
    })
  }, [venues, filters])


  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50">
      {/* Header/Nav would go here */}
      {/* Filter Panel */}
      <FilterPanel 
        filters={filters} 
        onFiltersChange={setFilters}
        venueCount={filteredVenues.length}
      />
      
      
      <main className="flex-1 relative">
        <KakaoMap 
          venues={filteredVenues} 
          center={mapCenter} 
          zoom={4} 
          userLocation={userLocation}
          onMarkerClick={(venue) => router.push(`/venues/${venue.id}`)}
          onCenterChanged={handleCenterChanged}
          onRequestUserLocation={handleRequestUserLocation}
        />
        
        {loading && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-md z-20 flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">PC방 찾는 중...</span>
          </div>
        )}
        
        {error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-50 text-red-600 px-4 py-2 rounded-full shadow-md z-20 text-sm font-medium">
            {error}
          </div>
        )}
        
        {/* Venue Count Badge */}
        {!loading && !error && filteredVenues.length > 0 && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-md z-20 text-sm font-medium text-gray-700">
            주변 {filteredVenues.length}개의 PC방 발견
          </div>
        )}
        
        {!loading && !error && venues.length > 0 && filteredVenues.length === 0 && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full shadow-md z-20 text-sm font-medium">
            필터 조건에 맞는 PC방이 없습니다
          </div>
        )}
      </main>
    </div>
  )
}
