import { test } from 'bun:test'
import {
  buildSeoulDistrictListTarget,
  parseSeoulDistricts,
  buildGetoListTarget,
  buildGetoSeedTargets,
} from '@/lib/pcbang/raw/geto-seed'

test('buildSeoulDistrictListTarget creates correct spec', () => {
  const target = buildSeoulDistrictListTarget()

  if (target.target_id !== 'district_list_json') {
    throw new Error(`Expected target_id 'district_list_json', got '${target.target_id}'`)
  }

  if (target.method !== 'POST') {
    throw new Error(`Expected method POST, got ${target.method}`)
  }

  if (target.url !== 'https://www.playgeto.com/landing/pcbang_json.php') {
    throw new Error(`Unexpected URL: ${target.url}`)
  }

  if (target.request_body !== 'areaName1=%EC%84%9C%EC%9A%B8') {
    throw new Error(`Unexpected request body: ${target.request_body}`)
  }

  if (!target.anonymous_safe) {
    throw new Error('Expected anonymous_safe to be true')
  }

  if (target.requires_auth || target.requires_captcha || target.is_mutating) {
    throw new Error('Expected all safety flags to be safe')
  }
})

test('parseSeoulDistricts extracts district names from JSON response', () => {
  const json_response = {
    result: [
      { AREANAME2: '강남구', AREANAME1: '서울' },
      { AREANAME2: '강서구', AREANAME1: '서울' },
      { AREANAME2: '마포구', AREANAME1: '서울' },
    ],
  }

  const result = parseSeoulDistricts(json_response)

  if (result.districts.length !== 3) {
    throw new Error(`Expected 3 districts, got ${result.districts.length}`)
  }

  if (!result.districts.includes('강남구')) {
    throw new Error('Expected 강남구 in districts')
  }

  if (!result.districts.includes('강서구')) {
    throw new Error('Expected 강서구 in districts')
  }

  if (!result.districts.includes('마포구')) {
    throw new Error('Expected 마포구 in districts')
  }
})

test('parseSeoulDistricts handles plain array format', () => {
  const json_response = ['강남구', '강서구', '마포구']

  const result = parseSeoulDistricts(json_response)

  if (result.districts.length !== 3) {
    throw new Error(`Expected 3 districts, got ${result.districts.length}`)
  }

  if (!result.districts.includes('강남구')) {
    throw new Error('Expected 강남구 in districts')
  }

  if (!result.districts.includes('강서구')) {
    throw new Error('Expected 강서구 in districts')
  }

  if (!result.districts.includes('마포구')) {
    throw new Error('Expected 마포구 in districts')
  }
})

test('parseSeoulDistricts throws on invalid input', () => {
  try {
    parseSeoulDistricts(null)
    throw new Error('Expected parseSeoulDistricts to throw on null')
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('Invalid district JSON response')) {
      throw new Error(`Expected specific error message, got: ${error}`)
    }
  }

  try {
    parseSeoulDistricts({ result: 'not an array' })
    throw new Error('Expected parseSeoulDistricts to throw on non-array result')
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('Expected district JSON to have result array or be a plain array')) {
      throw new Error(`Expected specific error message, got: ${error}`)
    }
  }
})

test('buildGetoListTarget creates correct spec for page 1', () => {
  const target = buildGetoListTarget('강남구', 1)

  if (target.target_id !== 'seoul_%EA%B0%95%EB%82%A8%EA%B5%AC_list_html') {
    throw new Error(`Expected encoded target_id, got '${target.target_id}'`)
  }

  if (!target.url.includes('selAreaName1=%EC%84%9C%EC%9A%B8')) {
    throw new Error('Expected URL to include Seoul parameter')
  }

  if (!target.url.includes('selAreaName2=%EA%B0%95%EB%82%A8%EA%B5%AC')) {
    throw new Error('Expected URL to include Gangnam district parameter')
  }

  if (target.url.includes('pageID')) {
    throw new Error('Expected page 1 URL to not include pageID')
  }

  if (target.method !== 'GET') {
    throw new Error(`Expected method GET, got ${target.method}`)
  }
})

test('buildGetoListTarget creates correct spec for page 2+', () => {
  const target = buildGetoListTarget('강남구', 2)

  if (target.target_id !== 'seoul_%EA%B0%95%EB%82%A8%EA%B5%AC_page_2_list_html') {
    throw new Error(`Expected encoded target_id with page, got '${target.target_id}'`)
  }

  if (!target.url.includes('pageID=2')) {
    throw new Error('Expected URL to include pageID=2')
  }
})

test('buildGetoSeedTargets respects district limit', () => {
  const districts = ['강남구', '강서구', '마포구', '종로구', '서초구']

  const targets = buildGetoSeedTargets(districts, { district_limit: 2, max_pages_per_district: 1 })

  if (targets.length !== 2) {
    throw new Error(`Expected 2 targets (2 districts × 1 page), got ${targets.length}`)
  }

  const target_ids = targets.map((t) => t.target_id)
  const first_encoded = encodeURIComponent('강남구')
  const second_encoded = encodeURIComponent('강서구')
  
  if (!target_ids[0].includes(first_encoded) || !target_ids[1].includes(second_encoded)) {
    throw new Error(`Expected first 2 districts (encoded) to be included, got: ${target_ids.join(', ')}`)
  }
})

test('buildGetoSeedTargets respects max_pages_per_district', () => {
  const districts = ['강남구', '강서구']

  const targets = buildGetoSeedTargets(districts, { district_limit: 2, max_pages_per_district: 3 })

  if (targets.length !== 6) {
    throw new Error(`Expected 6 targets (2 districts × 3 pages), got ${targets.length}`)
  }

  const page_1_targets = targets.filter((t) => !t.target_id.includes('_page_'))
  const page_2_targets = targets.filter((t) => t.target_id.includes('_page_2_'))
  const page_3_targets = targets.filter((t) => t.target_id.includes('_page_3_'))

  if (page_1_targets.length !== 2 || page_2_targets.length !== 2 || page_3_targets.length !== 2) {
    throw new Error('Expected 2 targets per page')
  }
})

test('buildGetoSeedTargets respects max_list_pages global cap', () => {
  const districts = ['강남구', '강서구', '마포구', '종로구', '서초구']

  const targets = buildGetoSeedTargets(districts, {
    district_limit: 5,
    max_pages_per_district: 10,
    max_list_pages: 7,
  })

  if (targets.length !== 7) {
    throw new Error(`Expected 7 targets (global cap), got ${targets.length}`)
  }
})

test('buildGetoSeedTargets throws on invalid config', () => {
  const districts = ['강남구']

  try {
    buildGetoSeedTargets(districts, { district_limit: 0 })
    throw new Error('Expected buildGetoSeedTargets to throw on district_limit=0')
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('district_limit must be at least 1')) {
      throw new Error(`Expected specific error message, got: ${error}`)
    }
  }

  try {
    buildGetoSeedTargets(districts, { max_pages_per_district: 0 })
    throw new Error('Expected buildGetoSeedTargets to throw on max_pages_per_district=0')
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('max_pages_per_district must be at least 1')) {
      throw new Error(`Expected specific error message, got: ${error}`)
    }
  }

  try {
    buildGetoSeedTargets(districts, { max_list_pages: 0 })
    throw new Error('Expected buildGetoSeedTargets to throw on max_list_pages=0')
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('max_list_pages must be at least 1')) {
      throw new Error(`Expected specific error message, got: ${error}`)
    }
  }
})

test('buildGetoSeedTargets uses defaults when no options provided', () => {
  const districts = Array.from({ length: 10 }, (_, i) => `district_${i}`)

  const targets = buildGetoSeedTargets(districts)

  if (targets.length !== 10) {
    throw new Error(
      `Expected 10 targets (default: 5 districts × 2 pages, capped at 10), got ${targets.length}`
    )
  }
})
