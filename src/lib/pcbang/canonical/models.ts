export type {
  CanonicalVenueRecord,
  CanonicalPricing,
  CanonicalPricingTier,
  CanonicalVenueWithPricing,
} from '@/lib/pcbang/dto'

export interface CanonicalizationSummary {
  accepted_count: number
  rejected_count: number
}
