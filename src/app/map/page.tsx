'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ElementType } from 'react'
import Link from 'next/link'
import { MapPin, Phone, Clock, Monitor, HardDrive, Cpu, ExternalLink, X, Settings2, ShieldCheck, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { KakaoMap } from '@/components/map/kakao-map'
import { Venue, VenueWithFilterData } from '@/types/venue'
import { VenueFilters, DEFAULT_FILTERS, meetsGPUTier, isVenueOpen, is24Hour, OperatingHours } from '@/types/filters'
import { FilterPanel } from '@/components/filter/filter-panel'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const SEOUL_CENTER = { lat: 37.5665, lng: 126.9780 }
const MAP_CENTER_FETCH_DEBOUNCE_MS = 300
const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 300000,
} as const

export default function MapPage() {
  const [venues, setVenues] = useState<VenueWithFilterData[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [mapCenter, setMapCenter] = useState(SEOUL_CENTER)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<VenueFilters>(DEFAULT_FILTERS)
  const [isInitialCenterResolved, setIsInitialCenterResolved] = useState(false)
  const latestRequestIdRef = useRef(0)

  // Venue Detail Sheet State
  const [selectedVenue, setSelectedVenue] = useState<VenueWithFilterData | null>(null)
  const [isVenueSheetOpen, setIsVenueSheetOpen] = useState(false)

  const handleMarkerClick = useCallback((venue: VenueWithFilterData) => {
    setSelectedVenue(venue)
    setIsVenueSheetOpen(true)
  }, [])

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
          onMarkerClick={handleMarkerClick}
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

      {/* Venue Detail Sheet */}
      <Sheet open={isVenueSheetOpen} onOpenChange={setIsVenueSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] md:h-[90vh] md:max-w-2xl md:right-0 md:left-auto md:border-l p-0 flex flex-col overflow-hidden" showCloseButton={false}>
          {selectedVenue && (
            <>
              <SheetHeader className="p-5 border-b border-gray-100 flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Zap className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <div>
                    <SheetTitle className="text-xl font-bold text-gray-950 truncate max-w-sm">
                      {selectedVenue.name}
                    </SheetTitle>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{selectedVenue.address_district}</span>
                      {selectedVenue.distance_meters != null && (
                        <>
                          <span>•</span>
                          <span>{Math.round(selectedVenue.distance_meters)}m</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <SheetClose asChild>
                  <Button aria-label="상세 시트 닫기" variant="ghost" size="icon" className="rounded-full h-10 w-10 text-gray-500 hover:text-gray-900 hover:bg-gray-100">
                    <X className="w-5 h-5" />
                  </Button>
                </SheetClose>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {selectedVenue.phone && (
                    <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3 border border-gray-100">
                      <Phone className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-gray-500">전화번호</div>
                        <div className="text-sm font-medium text-gray-900">{selectedVenue.phone}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3 border border-gray-100 col-span-2">
                    <Clock className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-gray-500">영업시간</div>
                      <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        {is24Hour(selectedVenue.operating_hours as OperatingHours) ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">24시간</Badge>
                        ) : isVenueOpen(selectedVenue.operating_hours as OperatingHours) ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">영업중</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">영업종료</Badge>
                        )}
                        <span className="text-xs text-gray-600">상세시간 본문 참고</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3 border border-gray-100">
                    <Settings2 className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-gray-500">총 좌석</div>
                      <div className="text-sm font-medium text-gray-900">{selectedVenue.total_seats || '-'}석</div>
                    </div>
                  </div>
                </div>

                {/* 2. PC Specs */}
                {selectedVenue.specs && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-950 flex items-center gap-2">
                      <Monitor className="w-5 h-5 text-indigo-600" />
                      PC 사양
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <SpecCard icon={Cpu} label="CPU" value={selectedVenue.specs.cpu} />
                      <SpecCard 
                        icon={Zap} 
                        label="GPU" 
                        value={selectedVenue.specs.gpu} 
                        badge={selectedVenue.specs.gpu.includes('40') ? 'High' : selectedVenue.specs.gpu.includes('30') ? 'Mid' : null} 
                      />
                      <SpecCard icon={HardDrive} label="RAM / Storage" value={`${selectedVenue.specs.ram_gb}GB / ${selectedVenue.specs.storage}`} />
                    </div>
                  </div>
                )}

                {/* 3. Peripherals & Amenities */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                  {selectedVenue.peripherals && selectedVenue.peripherals.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-950 flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-indigo-600" />
                        주변기기
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedVenue.peripherals.map((p, i) => (
                          <Badge key={i} variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200 px-3 py-1 text-sm font-normal">
                            <span className="font-semibold text-gray-950 mr-1.5">{p.brand}</span> {p.model}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-950 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-indigo-600" />
                      편의시설
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedVenue.amenities && selectedVenue.amenities.length > 0 ? (
                        selectedVenue.amenities.map((amenity) => (
                          <Badge key={amenity} variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 px-3 py-1 text-sm font-medium">
                            {amenity}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">정보 없음</span>
                      )}
                      {selectedVenue.parking_available && (
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 px-3 py-1 text-sm font-medium">
                          주차 가능
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* 4. Pricing Summary */}
                {selectedVenue.pricing && selectedVenue.pricing.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <h3 className="text-lg font-semibold text-gray-950">요금 정보 (요약)</h3>
                    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                      {selectedVenue.pricing.slice(0, 2).map((tier, index) => {
                        const numericPrices = tier.pricing_structure
                          ? Object.values(tier.pricing_structure).filter((v): v is number => typeof v === 'number')
                          : []
                        const minPrice = numericPrices.length > 0 ? Math.min(...numericPrices) : null
                        
                        return (
                          <div key={tier.tier_name} className={cn("p-5 flex items-center justify-between", index > 0 && "border-t border-gray-100")}>
                            <div>
                              <div className="font-semibold text-gray-900">{tier.tier_name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {tier.pricing_structure ? `${Object.keys(tier.pricing_structure).length}개 요금제` : '요금 정보 없음'}
                              </div>
                            </div>
                            {minPrice !== null && (
                              <div className="text-right">
                                <div className="text-sm text-gray-500">시간당 최저</div>
                                <div className="text-lg font-bold text-indigo-700">₩{minPrice.toLocaleString()}~</div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                      {selectedVenue.pricing.length > 2 && (
                        <div className="p-3 text-center bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                          외 {selectedVenue.pricing.length - 2}개 요금제 더 있음
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>

              <div className="sticky bottom-0 bg-white p-5 border-t border-gray-100 mt-auto shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" size="lg">
                  <Link href={`/venues/${selectedVenue.id}`}>
                    상세 정보 보기
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

interface SpecCardProps {
  icon: ElementType
  label: string
  value: string
  badge?: string | null
}

function SpecCard({ icon: Icon, label, value, badge }: SpecCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col gap-2.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-indigo-500" />
          {label}
        </div>
        {badge && (
          <Badge variant="outline" className={cn(
            "px-2 py-0.5 text-xs font-medium rounded",
            badge === 'High' ? "bg-amber-50 text-amber-700 border-amber-200" :
            badge === 'Mid' ? "bg-blue-50 text-blue-700 border-blue-200" :
            "bg-gray-50 text-gray-700 border-gray-200"
          )}>
            {badge}
          </Badge>
        )}
      </div>
      <div className="text-sm font-semibold text-gray-950 line-clamp-2 min-h-[40px]">
        {value}
      </div>
    </div>
  )
}
