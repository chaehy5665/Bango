import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { normalizePricingContract } from '@/lib/pcbang/contracts/pricing-contract'

describe('pricing contract', () => {
  test('normalizes legacy keys into canonical pricing keys', () => {
    const result = normalizePricingContract({
      tier_name: '일반석',
      pricing_structure: {
        hourly: 1400,
        '3hours': 3900,
        '6hours': 7300,
        overnight: 11000,
        package: {
          '3hours': 3800,
        },
      },
      description: '강남역 표준 게이밍 좌석',
    })

    assert.equal(result.ok, true)
    if (!result.ok) {
      return
    }

    assert.equal(result.value.tier_name, '일반석')
    assert.equal(result.value.pricing.hourly, 1400)
    assert.equal(result.value.pricing.package_3h, 3900)
    assert.equal(result.value.pricing.package_6h, 7300)
    assert.equal(result.value.pricing.package_overnight, 11000)
    assert.equal(result.value.pricing.notes, '강남역 표준 게이밍 좌석')
  })

  test('reject missing tier name', () => {
    const result = normalizePricingContract({
      pricing_structure: {
        hourly: 1300,
      },
    })

    assert.equal(result.ok, false)
    if (result.ok) {
      return
    }

    assert.equal(result.errors.includes('tier_name is required'), true)
  })
})
