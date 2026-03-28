import { test } from 'bun:test'
import { classifyLoadPolicy, buildVenueDedupeKey } from '@/lib/pcbang/load-policy'
import type { CanonicalVenueWithPricing } from '@/lib/pcbang/dto'

test('classifyLoadPolicy accepts valid canonical venues with pricing', () => {
  const incoming: CanonicalVenueWithPricing[] = [
    {
      venue: {
        name: 'Test PC방',
        address_full: '서울 강남구 테헤란로 123',
        address_district: '강남구',
        lat: 37.5,
        lng: 127.0,
      },
      pricing_tiers: [
        {
          tier_name: '일반석',
          pricing: {
            hourly: 1000,
            package_3h: null,
            package_6h: null,
            package_overnight: null,
            notes: null,
          },
        },
      ],
    },
  ]

  const result = classifyLoadPolicy(incoming, [])

  if (result.insertable.venues.length !== 1) {
    throw new Error(`Expected 1 insertable venue, got ${result.insertable.venues.length}`)
  }

  if (result.insertable.pricing.length !== 1) {
    throw new Error(`Expected 1 insertable pricing tier, got ${result.insertable.pricing.length}`)
  }

  if (result.errors.length > 0) {
    throw new Error(`Expected no errors, got ${result.errors.length}`)
  }
})

test('classifyLoadPolicy allows venue-only inserts when pricing tiers are missing', () => {
  const incoming: CanonicalVenueWithPricing[] = [
    {
      venue: {
        name: 'Test PC방',
        address_full: '서울 강남구 테헤란로 123',
        address_district: '강남구',
        lat: 37.5,
        lng: 127.0,
      },
      pricing_tiers: [],
    },
  ]

  const result = classifyLoadPolicy(incoming, [])

  if (result.insertable.venues.length !== 1) {
    throw new Error(`Expected 1 insertable venue, got ${result.insertable.venues.length}`)
  }

  if (result.insertable.pricing.length !== 0) {
    throw new Error(`Expected 0 insertable pricing tiers, got ${result.insertable.pricing.length}`)
  }

  if (result.errors.length !== 0) {
    throw new Error(`Expected no errors, got ${result.errors.length}`)
  }
})

test('classifyLoadPolicy flags existing venues for review', () => {
  const incoming: CanonicalVenueWithPricing[] = [
    {
      venue: {
        name: 'Existing PC방',
        address_full: '서울 강남구 테헤란로 456',
        address_district: '강남구',
        lat: 37.5,
        lng: 127.0,
      },
      pricing_tiers: [
        {
          tier_name: '일반석',
          pricing: {
            hourly: 1000,
            package_3h: null,
            package_6h: null,
            package_overnight: null,
            notes: null,
          },
        },
      ],
    },
  ]

  const existing = [
    {
      id: 'existing-1',
      name: 'Existing PC방',
      address_full: '서울 강남구 테헤란로 456',
      address_district: '강남구',
      pricing_tiers: ['일반석'],
    },
  ]

  const result = classifyLoadPolicy(incoming, existing)

  if (result.insertable.venues.length !== 0) {
    throw new Error(`Expected 0 insertable venues (should be flagged for review), got ${result.insertable.venues.length}`)
  }

  if (result.review_needed.length === 0) {
    throw new Error('Expected review_needed entries for existing venue')
  }

  const venue_review = result.review_needed.find((r) => r.reason.includes('matched_venue'))
  if (!venue_review) {
    throw new Error('Expected review entry for matched venue')
  }
})

test('buildVenueDedupeKey normalizes correctly', () => {
  const key1 = buildVenueDedupeKey('Test PC방', '서울 강남구 테헤란로 123', '강남구')
  const key2 = buildVenueDedupeKey('TEST  PC방', '서울   강남구  테헤란로  123', '강남구')

  if (key1 !== key2) {
    throw new Error(`Expected normalized keys to match:\n  key1: ${key1}\n  key2: ${key2}`)
  }

  if (!key1.includes('test pc방')) {
    throw new Error(`Expected key to contain normalized name, got: ${key1}`)
  }
})
