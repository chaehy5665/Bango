import type { SourceId } from '@/lib/pcbang/raw/dto'

export type ParserDiagnosticSeverity = 'info' | 'warning' | 'error'

export interface ParsedPricingTierCandidate {
  tier_name: string
  pricing_structure?: Record<string, unknown>
  description?: string
}

export interface ParserDiagnostic {
  severity: ParserDiagnosticSeverity
  target_id: string
  message: string
  context?: Record<string, unknown>
}

export interface ParsedVenueCandidate {
  source_entity_key: string
  name: string | null
  address_full: string | null
  address_district: string | null
  lat: number | null
  lng: number | null
  phone?: string | null
  operating_hours?: Record<string, string> | null
  amenities?: string[] | null
  total_seats?: number | null
  parking_available?: boolean | null
  pricing_tiers?: ParsedPricingTierCandidate[] | null
  raw_metadata?: Record<string, unknown>
}

export interface ParserResult {
  target_id: string
  candidates: ParsedVenueCandidate[]
  diagnostics: ParserDiagnostic[]
}

export interface ParserManifest {
  schema_version: 1
  parser_run_id: string
  source_id: SourceId
  raw_run_id: string
  parsed_at: string
  parsed_targets: string[]
  success_count: number
  diagnostic_counts: {
    info: number
    warning: number
    error: number
  }
}
