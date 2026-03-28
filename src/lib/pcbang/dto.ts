export interface PcbangSampleVenue {
  sample_id: string
  name: string
  address_full: string
  address_district: string
  lat: number
  lng: number
}

export interface SourceRubric {
  city: 'seoul'
  sample_size: 20
  legal_gate: {
    no_captcha_bypass: true
    no_mfa_bypass: true
    no_anti_bot_evasion: true
    automation_permitted_only: true
  }
  thresholds: {
    identity_recoverable_min: 16
    pricing_recoverable_min: number
    selector_navigation_stability_min: 18
    median_acquisition_seconds_max: 15
  }
}

export interface CanonicalVenueRecord {
  name: string
  address_full: string
  address_district: string
  lat: number
  lng: number
  phone?: string
  operating_hours?: Record<string, string>
  amenities?: string[]
  total_seats?: number
  parking_available?: boolean
}

export interface CanonicalPricing {
  hourly: number | null
  package_3h: number | null
  package_6h: number | null
  package_overnight: number | null
  notes: string | null
}

export interface CanonicalPricingTier {
  tier_name: string
  pricing: CanonicalPricing
}

export interface CanonicalVenueWithPricing {
  venue: CanonicalVenueRecord
  pricing_tiers: CanonicalPricingTier[]
}
