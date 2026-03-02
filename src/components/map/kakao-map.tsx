'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { Venue } from '@/types/venue'
import { parsePostGISPoint } from '@/utils/geo-parser'

declare global {
  interface Window {
    kakao: any
  }
}

interface KakaoMapProps {
  venues: Venue[]
  center?: { lat: number; lng: number }
  zoom?: number
  onMarkerClick?: (venue: Venue) => void
  userLocation?: { lat: number; lng: number } | null
}

const SEOUL_CENTER = { lat: 37.5665, lng: 126.9780 }

export function KakaoMap({
  venues,
  center = SEOUL_CENTER,
  zoom = 3,
  onMarkerClick,
  userLocation
}: KakaoMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const [mapInstance, setMapInstance] = useState<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const markersRef = useRef<any[]>([])
  const infoWindowRef = useRef<any>(null)

  // Load Kakao Maps SDK
  useEffect(() => {
    const script = document.createElement('script')
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false`
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
      level: zoom
    }
    
    const map = new window.kakao.maps.Map(mapContainer.current, options)
    setMapInstance(map)
    
    // Create InfoWindow once
    infoWindowRef.current = new window.kakao.maps.InfoWindow({ zIndex: 1 })

  }, [isLoaded]) // Only run once when loaded

  // Update Center when prop changes
  useEffect(() => {
    if (!mapInstance || !center) return
    const moveLatLon = new window.kakao.maps.LatLng(center.lat, center.lng)
    mapInstance.panTo(moveLatLon)
  }, [center, mapInstance])

  // Update Markers when venues change
  useEffect(() => {
    if (!mapInstance || !isLoaded) return
    
    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []
    
    venues.forEach(venue => {
      const latLng = typeof venue.location === 'string' 
        ? parsePostGISPoint(venue.location)
        : venue.location.coordinates ? { lat: venue.location.coordinates[1], lng: venue.location.coordinates[0] } : null

      if (!latLng) return

      const markerPosition = new window.kakao.maps.LatLng(latLng.lat, latLng.lng)
      
      const marker = new window.kakao.maps.Marker({
        position: markerPosition,
        clickable: true
      })
      
      marker.setMap(mapInstance)
      markersRef.current.push(marker)
      
      // Add click event
      window.kakao.maps.event.addListener(marker, 'click', () => {
        // Close previous info window
        infoWindowRef.current.close()
        
        // Content for InfoWindow
        const content = `
          <div style="padding:15px;min-width:200px;font-family:-apple-system, BlinkMacSystemFont, sans-serif;">
            <h4 style="margin:0 0 5px;font-size:16px;font-weight:bold;">${venue.name}</h4>
            <p style="margin:0;font-size:13px;color:#666;">${venue.address_district}</p>
            <p style="margin:5px 0 0;font-size:12px;color:#888;">
              ${venue.distance_meters ? `${Math.round(venue.distance_meters)}m` : ''}
            </p>
          </div>
        `
        
        infoWindowRef.current.setContent(content)
        infoWindowRef.current.open(mapInstance, marker)
        
        if (onMarkerClick) onMarkerClick(venue)
      })
    })
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
