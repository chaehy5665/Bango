import type { CaptureTargetSpec } from '@/lib/pcbang/raw/dto'

export interface SeoulDistrictNames {
  districts: string[]
}

export interface GetoSeedOptions {
  district_limit?: number
  max_pages_per_district?: number
  max_list_pages?: number
}

const DEFAULT_DISTRICT_LIMIT = 5
const DEFAULT_MAX_PAGES_PER_DISTRICT = 2
const DEFAULT_MAX_LIST_PAGES = 10

export function buildSeoulDistrictListTarget(): CaptureTargetSpec {
  return {
    target_id: 'district_list_json',
    method: 'POST',
    url: 'https://www.playgeto.com/landing/pcbang_json.php',
    request_body: 'areaName1=%EC%84%9C%EC%9A%B8',
    request_headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
    },
    anonymous_safe: true,
    requires_auth: false,
    requires_captcha: false,
    is_mutating: false,
    description: 'GetO public district-list JSON endpoint for the selected first-level region',
  }
}

export async function fetchSeoulDistricts(timeout_ms = 30000): Promise<SeoulDistrictNames> {
  const target = buildSeoulDistrictListTarget()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeout_ms)

  try {
    const headers = new Headers(target.request_headers)
    headers.set('User-Agent', 'Mozilla/5.0 (compatible; BangoRawCollector/1.0)')
    headers.set('Accept', '*/*')

    const response = await fetch(target.url, {
      method: target.method,
      headers,
      body: target.request_body,
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const text = await response.text()
    return parseSeoulDistricts(JSON.parse(text))
  } finally {
    clearTimeout(timeout)
  }
}

export function parseSeoulDistricts(json_response: unknown): SeoulDistrictNames {
  if (!json_response) {
    throw new Error('Invalid district JSON response')
  }

  // Handle plain array format: ["강남구", "강서구", ...]
  if (Array.isArray(json_response)) {
    const districts = json_response.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    return { districts }
  }

  // Handle object with result array format: { result: [{ AREANAME2: "강남구" }, ...] }
  if (typeof json_response === 'object') {
    const record = json_response as Record<string, unknown>
    if (!Array.isArray(record.result)) {
      throw new Error('Expected district JSON to have result array or be a plain array')
    }

    const districts: string[] = []
    for (const item of record.result) {
      if (typeof item === 'object' && item !== null) {
        const entry = item as Record<string, unknown>
        if (typeof entry.AREANAME2 === 'string' && entry.AREANAME2.trim()) {
          districts.push(entry.AREANAME2.trim())
        }
      }
    }

    return { districts }
  }

  throw new Error('Invalid district JSON response')
}

export function buildGetoListTarget(district: string, page_id: number): CaptureTargetSpec {
  const target_id =
    page_id === 1
      ? `seoul_${encodeURIComponent(district)}_list_html`
      : `seoul_${encodeURIComponent(district)}_page_${page_id}_list_html`

  const encoded_district = encodeURIComponent(district)
  const url_base = 'https://www.playgeto.com/landing/pcbang_find_coupon.html'
  const url =
    page_id === 1
      ? `${url_base}?selAreaName1=%EC%84%9C%EC%9A%B8&selAreaName2=${encoded_district}&pcbangname=&STarget=A`
      : `${url_base}?selAreaName1=%EC%84%9C%EC%9A%B8&selAreaName2=${encoded_district}&pcbangname=&STarget=A&pageID=${page_id}`

  return {
    target_id,
    method: 'GET',
    url,
    anonymous_safe: true,
    requires_auth: false,
    requires_captcha: false,
    is_mutating: false,
    description: `GetO list page for Seoul/${district}, page ${page_id}`,
  }
}

export function buildGetoSeedTargets(
  districts: string[],
  options: GetoSeedOptions = {}
): CaptureTargetSpec[] {
  const district_limit = options.district_limit ?? DEFAULT_DISTRICT_LIMIT
  const max_pages_per_district = options.max_pages_per_district ?? DEFAULT_MAX_PAGES_PER_DISTRICT
  const max_list_pages = options.max_list_pages ?? DEFAULT_MAX_LIST_PAGES

  if (district_limit < 1) {
    throw new Error('district_limit must be at least 1')
  }
  if (max_pages_per_district < 1) {
    throw new Error('max_pages_per_district must be at least 1')
  }
  if (max_list_pages < 1) {
    throw new Error('max_list_pages must be at least 1')
  }

  const targets: CaptureTargetSpec[] = []
  const limited_districts = districts.slice(0, district_limit)

  let total_pages = 0

  for (const district of limited_districts) {
    for (let page = 1; page <= max_pages_per_district; page++) {
      if (total_pages >= max_list_pages) {
        break
      }
      targets.push(buildGetoListTarget(district, page))
      total_pages++
    }
    if (total_pages >= max_list_pages) {
      break
    }
  }

  return targets
}
