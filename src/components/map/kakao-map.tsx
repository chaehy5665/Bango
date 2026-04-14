'use client'

import { useEffect, useRef, useState } from 'react'
import { Venue } from '@/types/venue'
import { parsePostGISPoint } from '@/utils/geo-parser'

interface KakaoLatLng {
  getLat: () => number
  getLng: () => number
}

interface KakaoMapInstance {
  panTo: (latLng: KakaoLatLng) => void
  getCenter: () => KakaoLatLng
  setLevel: (level: number) => void
  getLevel: () => number
}

interface KakaoMarker {
  setMap: (map: KakaoMapInstance | null) => void
}

interface KakaoInfoWindow {
  close: () => void
  setContent: (content: string) => void
  open: (map: KakaoMapInstance, marker: KakaoMarker) => void
}

interface KakaoMarkerClusterer {
  clear: () => void
  addMarkers: (markers: KakaoMarker[]) => void
}

type KakaoSize = object
type KakaoMarkerImage = object

interface KakaoMapsNamespace {
  load: (callback: () => void) => void
  LatLng: new (lat: number, lng: number) => KakaoLatLng
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMapInstance
  InfoWindow: new (options: { zIndex: number }) => KakaoInfoWindow
  MarkerClusterer: new (options: {
    map: KakaoMapInstance
    averageCenter: boolean
    minLevel: number
    minClusterSize: number
    gridSize: number
  }) => KakaoMarkerClusterer
  Marker: new (options: { position: KakaoLatLng; clickable?: boolean; image?: KakaoMarkerImage }) => KakaoMarker
  Size: new (width: number, height: number) => KakaoSize
  MarkerImage: new (src: string, size: KakaoSize) => KakaoMarkerImage
  event: {
    addListener: (target: KakaoMarker | KakaoMapInstance, eventName: string, handler: () => void) => void
  }
}

declare global {
  interface Window {
    kakao: {
      maps: KakaoMapsNamespace
    }
  }
}

interface KakaoMapProps {
  venues: Venue[]
  center?: { lat: number; lng: number }
  zoom?: number
  onMarkerClick?: (venue: Venue) => void
  onCenterChanged?: (center: { lat: number; lng: number }) => void
  userLocation?: { lat: number; lng: number } | null
}

const SEOUL_CENTER = { lat: 37.5665, lng: 126.9780 }

export function KakaoMap({
  venues,
  center = SEOUL_CENTER,
  zoom = 3,
  onMarkerClick,
  onCenterChanged,
  userLocation
}: KakaoMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const [mapInstance, setMapInstance] = useState<KakaoMapInstance | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const markersRef = useRef<KakaoMarker[]>([])
  const clustererRef = useRef<KakaoMarkerClusterer | null>(null)
  const infoWindowRef = useRef<KakaoInfoWindow | null>(null)
  const isProgrammaticPan = useRef(false)
  const onCenterChangedRef = useRef(onCenterChanged)

  useEffect(() => {
    onCenterChangedRef.current = onCenterChanged
  }, [onCenterChanged])

  // Load Kakao Maps SDK
  useEffect(() => {
    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false&libraries=clusterer`
    script.async = true
    
    script.onload = () => {
      window.kakao.maps.load(() => {
        setIsLoaded(true)
      })
    }
    
    document.head.appendChild(script)
    
    return () => {
      document.head.removeChild(script)
    }
  }, [])

  // Initialize Map
  useEffect(() => {
    if (!isLoaded || !mapContainer.current) return

    const options = {
      center: new window.kakao.maps.LatLng(center.lat, center.lng),
      level: zoom,
    }
    
    const map = new window.kakao.maps.Map(mapContainer.current, options)
    setMapInstance(map)
    
    infoWindowRef.current = new window.kakao.maps.InfoWindow({ zIndex: 1 })

    clustererRef.current = new window.kakao.maps.MarkerClusterer({
      map: map,
      averageCenter: true,
      minLevel: 5,
      minClusterSize: 2,
      gridSize: 60,
    })

    window.kakao.maps.event.addListener(map, 'idle', () => {
      if (isProgrammaticPan.current) {
        isProgrammaticPan.current = false
        return
      }

      const centerChangeHandler = onCenterChangedRef.current
      if (!centerChangeHandler) return

      const centerLatLng = map.getCenter()
      centerChangeHandler({
        lat: centerLatLng.getLat(),
        lng: centerLatLng.getLng()
      })
    })

  }, [isLoaded])

  // Update Center when prop changes
  useEffect(() => {
    if (!mapInstance || !center) return
    const currentCenter = mapInstance.getCenter()
    if (currentCenter.getLat() === center.lat && currentCenter.getLng() === center.lng) return
    
    isProgrammaticPan.current = true
    const moveLatLon = new window.kakao.maps.LatLng(center.lat, center.lng)
    mapInstance.panTo(moveLatLon)
  }, [center, mapInstance])

  useEffect(() => {
    if (!mapInstance) return
    mapInstance.setLevel(zoom)
  }, [mapInstance, zoom])

  // Update Markers when venues change
  useEffect(() => {
    if (!mapInstance || !isLoaded || !clustererRef.current) return
    
    clustererRef.current.clear()
    markersRef.current = []
    
    const newMarkers: KakaoMarker[] = []
    
    venues.forEach(venue => {
      const latLng = typeof venue.location === 'string' 
        ? parsePostGISPoint(venue.location)
        : null

      if (!latLng) return

      const markerPosition = new window.kakao.maps.LatLng(latLng.lat, latLng.lng)
      
      const marker = new window.kakao.maps.Marker({
        position: markerPosition,
        clickable: true
      })
      
      newMarkers.push(marker)
      
      window.kakao.maps.event.addListener(marker, 'click', () => {
        infoWindowRef.current?.close()
        
        const content = `
          <div style="padding:15px;min-width:200px;font-family:-apple-system, BlinkMacSystemFont, sans-serif;">
            <h4 style="margin:0 0 5px;font-size:16px;font-weight:bold;">${venue.name}</h4>
            <p style="margin:0;font-size:13px;color:#666;">${venue.address_district}</p>
            <p style="margin:5px 0 0;font-size:12px;color:#888;">
              ${venue.distance_meters ? `${Math.round(venue.distance_meters)}m` : ''}
            </p>
          </div>
        `
        
        infoWindowRef.current?.setContent(content)
        infoWindowRef.current?.open(mapInstance, marker)
        
        if (onMarkerClick) onMarkerClick(venue)
      })
    })
    
    markersRef.current = newMarkers
    clustererRef.current.addMarkers(newMarkers)
  }, [venues, mapInstance, isLoaded, onMarkerClick])

  // User Location Marker
  useEffect(() => {
    if (!mapInstance || !userLocation) return
    
    // Create a custom image for user location if desired, or simple marker
    const locPosition = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng)
    
    // Optional: different marker image for user
    const imageSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png'
    const imageSize = new window.kakao.maps.Size(24, 35)
    const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize)
    
    const marker = new window.kakao.maps.Marker({
      position: locPosition,
      image: markerImage
    })
    
    marker.setMap(mapInstance)
    
    return () => {
      marker.setMap(null)
    }
  }, [userLocation, mapInstance])

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Map Controls Overlay */}
      <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-2">
        <button 
          onClick={() => {
            if (userLocation && mapInstance) {
              const loc = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng)
              mapInstance.panTo(loc)
            } else {
              alert('위치 정보를 가져올 수 없습니다.')
            }
          }}
          className="bg-white p-3 rounded-full shadow-lg hover:bg-gray-50 transition-colors"
          aria-label="My Location"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
            <path d="M12 2a10 10 0 1 0 10 10 10.011 10.011 0 0 0-10-10zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8z" />
            <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0" />
          </svg>
        </button>
        
        <div className="bg-white rounded-lg shadow-lg flex flex-col overflow-hidden">
          <button 
            onClick={() => mapInstance?.setLevel(mapInstance.getLevel() - 1)}
            className="p-3 hover:bg-gray-50 border-b border-gray-100"
            aria-label="Zoom In"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <button 
            onClick={() => mapInstance?.setLevel(mapInstance.getLevel() + 1)}
            className="p-3 hover:bg-gray-50"
            aria-label="Zoom Out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
