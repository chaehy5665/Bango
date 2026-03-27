import { Database } from './database'

// Derive types from auto-generated database schema
// Use Omit to override PostGIS GEOGRAPHY 'location' field which is typed as 'unknown'
type VenueRow = Database['public']['Tables']['venues']['Row']

export type Venue = Omit<VenueRow, 'location'> & {
  location: string  // PostGIS GEOGRAPHY as EWKB hex string
  // distance_meters is added by RPC functions (nearby_venues, nearest_venues)
  distance_meters?: number
}

export interface Coordinates {
  lat: number
  lng: number
}

// Extended venue type with pricing, specs, and peripherals for filtering
export interface VenueWithFilterData extends Venue {
  pricing?: {
    tier_name: string
    pricing_structure: Record<string, unknown>
  }[]
  specs?: {
    cpu: string
    gpu: string
    ram_gb: number
    storage: string
    monitor: string
    internet_speed_mbps?: number
  } | null
  peripherals?: {
    peripheral_type: string
    brand: string
    model?: string
  }[]
}
