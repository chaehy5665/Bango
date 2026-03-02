export interface Venue {
  id: string
  name: string
  // PostGIS location usually returns as EWKB hex string or GeoJSON if cast
  // But our RPC returns GEOGRAPHY(POINT, 4326) directly, which often comes as hex
  // We'll handle parsing in the component or a utility
  location: string | { type: string, coordinates: number[] } 
  address_full: string
  address_district: string
  phone: string | null
  operating_hours: Record<string, string>
  amenities: string[]
  total_seats: number | null
  parking_available: boolean
  distance_meters: number
  created_at: string
  updated_at: string
}

export interface Coordinates {
  lat: number
  lng: number
}
