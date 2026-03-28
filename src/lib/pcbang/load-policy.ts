import type { CanonicalPricingTier, CanonicalVenueWithPricing } from '@/lib/pcbang/dto'
import { normalizePricingContract } from '@/lib/pcbang/contracts/pricing-contract'
import { validateVenueContract } from '@/lib/pcbang/contracts/venue-contract'

export interface ExistingVenueSnapshot {
  id: string
  name: string
  address_full: string
  address_district: string
  pricing_tiers: string[]
}

interface InsertableVenue {
  dedupe_key: string
  venue: CanonicalVenueWithPricing['venue']
}

interface InsertablePricing {
  dedupe_key: string
  tier_name: string
  pricing: CanonicalPricingTier['pricing']
}

interface ReviewNeededEntry {
  dedupe_key: string
  reason: string
  venue_name: string
  tier_name?: string
}

interface SkippedEntry {
  reason: string
  venue_name?: string
  errors: string[]
}

interface ErrorEntry {
  reason: string
  venue_name?: string
  tier_name?: string
}

export interface LoadPolicyResult {
  insertable: {
    venues: InsertableVenue[]
    pricing: InsertablePricing[]
  }
  review_needed: ReviewNeededEntry[]
  skipped: SkippedEntry[]
  errors: ErrorEntry[]
}

export function normalizeForKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[()\[\]{}'".,!?/\\-]/g, '')
}

export function buildVenueDedupeKey(name: string, addressFull: string, district: string): string {
  return [normalizeForKey(name), normalizeForKey(addressFull), district.trim().toLowerCase()].join('::')
}

export function classifyLoadPolicy(
  incoming: CanonicalVenueWithPricing[],
  existing: ExistingVenueSnapshot[]
): LoadPolicyResult {
  const existingByKey = new Map<string, ExistingVenueSnapshot>()
  for (const venue of existing) {
    const key = buildVenueDedupeKey(venue.name, venue.address_full, venue.address_district)
    existingByKey.set(key, venue)
  }

  const insertableVenues: InsertableVenue[] = []
  const insertablePricing: InsertablePricing[] = []
  const reviewNeeded: ReviewNeededEntry[] = []
  const skipped: SkippedEntry[] = []
  const errors: ErrorEntry[] = []

  for (const record of incoming) {
    const venueResult = validateVenueContract(record.venue)
    if (!venueResult.ok) {
      skipped.push({
        reason: 'venue_contract_failed',
        venue_name: typeof record.venue?.name === 'string' ? record.venue.name : undefined,
        errors: venueResult.errors,
      })
      continue
    }

    const dedupeKey = buildVenueDedupeKey(
      venueResult.value.name,
      venueResult.value.address_full,
      venueResult.value.address_district
    )
    const matchedVenue = existingByKey.get(dedupeKey)

    if (matchedVenue) {
      reviewNeeded.push({
        dedupe_key: dedupeKey,
        reason: 'matched_venue_requires_review',
        venue_name: venueResult.value.name,
      })

      for (const tier of record.pricing_tiers) {
        reviewNeeded.push({
          dedupe_key: dedupeKey,
          reason: 'matched_venue_pricing_requires_review',
          venue_name: venueResult.value.name,
          tier_name: tier.tier_name,
        })
      }

      continue
    }

    const venueInsertablePricing: InsertablePricing[] = []
    const seenTierNames = new Set<string>()
    for (const tier of record.pricing_tiers) {
      const tierResult = normalizePricingContract(tier)
      if (!tierResult.ok) {
        skipped.push({
          reason: 'pricing_contract_failed',
          venue_name: venueResult.value.name,
          errors: tierResult.errors,
        })
        continue
      }

      const normalizedTierName = normalizeForKey(tierResult.value.tier_name)
      if (seenTierNames.has(normalizedTierName)) {
        reviewNeeded.push({
          dedupe_key: dedupeKey,
          reason: 'matched_venue_tier_requires_review',
          venue_name: venueResult.value.name,
          tier_name: tierResult.value.tier_name,
        })
        continue
      }
      seenTierNames.add(normalizedTierName)

      venueInsertablePricing.push({
        dedupe_key: dedupeKey,
        tier_name: tierResult.value.tier_name,
        pricing: tierResult.value.pricing,
      })
    }

    insertableVenues.push({
      dedupe_key: dedupeKey,
      venue: venueResult.value,
    })
    insertablePricing.push(...venueInsertablePricing)
  }

  return {
    insertable: {
      venues: insertableVenues,
      pricing: insertablePricing,
    },
    review_needed: reviewNeeded,
    skipped,
    errors,
  }
}
