import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { validateVenueContract } from '@/lib/pcbang/contracts/venue-contract'

describe('venue contract', () => {
  test('accepts valid canonical venue payload', () => {
    const result = validateVenueContract({
      name: '레전드 PC방 강남역점',
      address_full: '서울특별시 강남구 강남대로 396',
      address_district: '강남구',
      lat: 37.4979,
      lng: 127.0286,
      phone: '02-561-1720',
      operating_hours: {
        weekday: '00:00-24:00',
        weekend: '00:00-24:00',
      },
      amenities: ['24시간', '무료 음료'],
      total_seats: 132,
      parking_available: true,
    })

    assert.equal(result.ok, true)
    if (!result.ok) {
      return
    }

    assert.equal(result.value.name, '레전드 PC방 강남역점')
    assert.equal(result.value.address_district, '강남구')
    assert.equal(result.value.lat, 37.4979)
    assert.equal(result.value.lng, 127.0286)
  })

  test('reject missing district and geo', () => {
    const result = validateVenueContract({
      name: '강남 테스트',
      address_full: '서울특별시 강남구 강남대로 1',
      lat: null,
      lng: undefined,
    })

    assert.equal(result.ok, false)
    if (result.ok) {
      return
    }

    assert.equal(result.errors.includes('address_district is required'), true)
    assert.equal(result.errors.includes('lat and lng must be resolved numbers'), true)
  })
})
