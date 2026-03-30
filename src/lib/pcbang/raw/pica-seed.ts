import type { CaptureTargetSpec } from '@/lib/pcbang/raw/dto'

const DEFAULT_MAX_PAGES = 20

export function buildPicaPageTarget(page_num: number): CaptureTargetSpec {
  if (page_num === 1) {
    return {
      target_id: 'main_pcbang_list_json',
      method: 'POST',
      url: 'https://www.picaplay.com/pcbang/mainPcbangList.do',
      request_body: 'currentPageNo=1',
      request_headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
      },
      anonymous_safe: true,
      requires_auth: false,
      requires_captcha: false,
      is_mutating: false,
      description: 'Pica public POST JSON endpoint for PC방 listings page 1',
    }
  }

  return {
    target_id: `main_pcbang_list_page_${page_num}_json`,
    method: 'POST',
    url: 'https://www.picaplay.com/pcbang/mainPcbangList.do',
    request_body: `currentPageNo=${page_num}`,
    request_headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
    },
    anonymous_safe: true,
    requires_auth: false,
    requires_captcha: false,
    is_mutating: false,
    description: `Pica public POST JSON endpoint for PC방 listings page ${page_num}`,
  }
}

export function buildPicaSeedTargets(max_pages?: number): CaptureTargetSpec[] {
  const page_count = max_pages ?? DEFAULT_MAX_PAGES
  if (page_count < 1) {
    throw new Error('max_pages must be at least 1')
  }

  const targets: CaptureTargetSpec[] = []
  for (let page = 1; page <= page_count; page++) {
    targets.push(buildPicaPageTarget(page))
  }
  return targets
}
