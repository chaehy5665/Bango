'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { KakaoMap } from '@/components/map/kakao-map'
import { Venue, VenueWithFilterData } from '@/types/venue'
import { VenueFilters, DEFAULT_FILTERS, meetsGPUTier, isVenueOpen, is24Hour, OperatingHours } from '@/types/filters'
import { FilterPanel } from '@/components/filter/filter-panel'

const SEOUL_CENTER = { lat: 37.5665, lng: 126.9780 }

export default function MapPage() {
  const router = useRouter()
  const [venues, setVenues] = useState<VenueWithFilterData[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [mapCenter, setMapCenter] = useState(SEOUL_CENTER)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<VenueFilters>(DEFAULT_FILTERS)

  const fetchVenues = async (lat: number, lng: number, radiusMeters: number = 5000) => {
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
      
      // Fetch pricing, specs, and peripherals for all venues in parallel
      const venuesWithData = await Promise.all(
        venueList.map(async (venue) => {
          const [pricingRes, specsRes, peripheralsRes] = await Promise.all([
            supabase.from('venue_pricing').select('tier_name, pricing_structure').eq('venue_id', venue.id),
            supabase.from('venue_specs').select('cpu, gpu, ram_gb, storage, monitor, internet_speed_mbps').eq('venue_id', venue.id).single(),
            supabase.from('venue_peripherals').select('peripheral_type, brand, model').eq('venue_id', venue.id)
          ])
          
          return {
            ...venue,
            pricing: pricingRes.data || [],
            specs: specsRes.data || null,
            peripherals: peripheralsRes.data || []
          } as VenueWithFilterData
        })
      )
      
      setVenues(venuesWithData)
    } catch {
      setError('주변 PC방을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 1. Try to get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          const userLoc = { lat: latitude, lng: longitude }
          setUserLocation(userLoc)
          setMapCenter(userLoc)
          fetchVenues(latitude, longitude, DEFAULT_FILTERS.distance)
        },
        () => {
          // Fallback to Seoul center
          fetchVenues(SEOUL_CENTER.lat, SEOUL_CENTER.lng, DEFAULT_FILTERS.distance)
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      )
    } else {
      // Fallback if geolocation not supported
      fetchVenues(SEOUL_CENTER.lat, SEOUL_CENTER.lng, DEFAULT_FILTERS.distance)
    }
  }, [])

  // Handle filter changes - refetch venues with new distance radius
  const activeLocation = userLocation ?? SEOUL_CENTER

  useEffect(() => {
    fetchVenues(activeLocation.lat, activeLocation.lng, filters.distance)
  }, [activeLocation.lat, activeLocation.lng, filters.distance])

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
