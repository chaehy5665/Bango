import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { classifyLoadPolicy, type ExistingVenueSnapshot } from '@/lib/pcbang/load-policy'

describe('load policy', () => {
  test('marks new venue insertable and existing venue review-needed', () => {
    const existing: ExistingVenueSnapshot[] = [
      {
        id: 'existing-1',
        name: '레전드 PC방 강남역점',
        address_full: '서울특별시 강남구 강남대로 396',
        address_district: '강남구',
        pricing_tiers: ['일반석'],
      },
    ]

    const result = classifyLoadPolicy(
      [
        {
          venue: {
            name: '레전드 PC방 강남역점',
            address_full: '서울특별시 강남구 강남대로 396',
            address_district: '강남구',
            lat: 37.4979,
            lng: 127.0286,
          },
          pricing_tiers: [
            {
              tier_name: '일반석',
              pricing: {
                hourly: 1400,
                package_3h: 3900,
                package_6h: 7300,
                package_overnight: 11000,
                notes: null,
              },
            },
          ],
        },
        {
          venue: {
            name: '강북 디지털 PC존',
            address_full: '서울특별시 강북구 도봉로 170',
            address_district: '강북구',
            lat: 37.6393,
            lng: 127.0256,
          },
          pricing_tiers: [
            {
              tier_name: '일반석',
              pricing: {
                hourly: 1200,
                package_3h: 3400,
                package_6h: 6400,
                package_overnight: 9200,
                notes: null,
              },
            },
          ],
        },
      ],
      existing
    )

    assert.equal(result.insertable.venues.length, 1)
    assert.equal(result.insertable.venues[0].venue.name, '강북 디지털 PC존')
    assert.equal(result.review_needed.length >= 2, true)
    assert.equal(result.errors.length, 0)
  })

  test('reject destructive overwrite path and keep matched tiers in review', () => {
    const existing: ExistingVenueSnapshot[] = [
      {
        id: 'existing-1',
        name: '레전드 PC방 강남역점',
        address_full: '서울특별시 강남구 강남대로 396',
        address_district: '강남구',
        pricing_tiers: ['일반석', '프리미엄석'],
      },
    ]

    const result = classifyLoadPolicy(
      [
        {
          venue: {
            name: '레전드 PC방 강남역점',
            address_full: '서울특별시 강남구 강남대로 396',
            address_district: '강남구',
            lat: 37.4979,
            lng: 127.0286,
          },
          pricing_tiers: [
            {
              tier_name: '일반석',
              pricing: {
                hourly: 1000,
                package_3h: 3000,
                package_6h: 6000,
                package_overnight: 9000,
                notes: 'attempt overwrite',
              },
            },
          ],
        },
      ],
      existing
    )

    assert.equal(result.insertable.venues.length, 0)
    assert.equal(result.insertable.pricing.length, 0)
    assert.equal(result.review_needed.length, 2)
    assert.equal(result.review_needed[0].reason, 'matched_venue_requires_review')
    assert.equal(result.review_needed[1].reason, 'matched_venue_pricing_requires_review')
  })

  test('routes contract failures to skipped bucket', () => {
    const result = classifyLoadPolicy(
      [
        {
          venue: {
            name: '좌표 없음 PC방',
            address_full: '서울특별시 강북구 도봉로 100',
            address_district: '',
            lat: Number.NaN,
            lng: 127,
          },
          pricing_tiers: [],
        },
      ],
      []
    )

    assert.equal(result.skipped.length, 1)
    assert.equal(result.skipped[0].reason, 'venue_contract_failed')
  })

  test('allows venue-only insert when pricing tiers are absent', () => {
    const result = classifyLoadPolicy(
      [
        {
          venue: {
            name: '가격 없음 PC방',
            address_full: '서울특별시 강북구 도봉로 101',
            address_district: '강북구',
            lat: 37.6394,
            lng: 127.0257,
          },
          pricing_tiers: [],
        },
      ],
      []
    )

    assert.equal(result.insertable.venues.length, 1)
    assert.equal(result.insertable.pricing.length, 0)
    assert.equal(result.errors.length, 0)
    assert.equal(result.insertable.venues[0].venue.name, '가격 없음 PC방')
  })
})
