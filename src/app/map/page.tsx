'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KakaoMap } from '@/components/map/kakao-map'
import { Venue } from '@/types/venue'
import { parsePostGISPoint } from '@/utils/geo-parser'

const SEOUL_CENTER = { lat: 37.5665, lng: 126.9780 }

export default function MapPage() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [mapCenter, setMapCenter] = useState(SEOUL_CENTER)
  const [error, setError] = useState<string | null>(null)

  const fetchVenues = async (lat: number, lng: number) => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    
    try {
      const { data, error } = await supabase.rpc('nearby_venues', {
        user_lat: lat,
        user_lng: lng,
        radius_meters: 5000, // 5km radius to show enough venues
        limit_count: 50
      })

      if (error) throw error
      
      console.log('Fetched venues:', data)
      setVenues(data || [])
    } catch (err: any) {
      console.error('Error fetching venues:', err)
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
          fetchVenues(latitude, longitude)
        },
        (error) => {
          console.log('Geolocation denied or failed:', error)
          // Fallback to Seoul center
          fetchVenues(SEOUL_CENTER.lat, SEOUL_CENTER.lng)
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      )
    } else {
      // Fallback if geolocation not supported
      fetchVenues(SEOUL_CENTER.lat, SEOUL_CENTER.lng)
    }
  }, [])

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header/Nav would go here */}
      
      <main className="flex-1 relative">
        <KakaoMap 
          venues={venues} 
          center={mapCenter} 
          zoom={4} 
          userLocation={userLocation}
          onMarkerClick={(venue) => console.log('Clicked venue:', venue)}
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
        {!loading && !error && venues.length > 0 && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-md z-20 text-sm font-medium text-gray-700">
            주변 {venues.length}개의 PC방 발견
          </div>
        )}
      </main>
    </div>
  )
}
