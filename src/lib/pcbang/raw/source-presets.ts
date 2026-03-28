import type { CaptureTargetSpec, SourceId, SourcePreset } from '@/lib/pcbang/raw/dto'

export const GETO_TARGETS: Record<string, CaptureTargetSpec> = {
  landing_html: {
    target_id: 'landing_html',
    method: 'GET',
    url: 'https://www.playgeto.com/landing/pcbang_find_coupon.html',
    anonymous_safe: true,
    requires_auth: false,
    requires_captcha: false,
    is_mutating: false,
    description: 'GetO public PC방 search landing page',
  },
  seoul_gangnam_list_html: {
    target_id: 'seoul_gangnam_list_html',
    method: 'GET',
    url: 'https://www.playgeto.com/landing/pcbang_find_coupon.html?selAreaName1=%EC%84%9C%EC%9A%B8&selAreaName2=%EA%B0%95%EB%82%A8%EA%B5%AC&pcbangname=&STarget=A',
    anonymous_safe: true,
    requires_auth: false,
    requires_captcha: false,
    is_mutating: false,
    description: 'GetO filtered Seoul/Gangnam public list page',
  },
  sample_detail_html: {
    target_id: 'sample_detail_html',
    method: 'GET',
    url: 'https://www.playgeto.com/landing/pcbang_find_detail.html?shop_seq=1005076&s_target=A&region1=%EC%84%9C%EC%9A%B8&region2=%EA%B0%95%EB%82%A8%EA%B5%AC&shop_name=%28%EC%A3%BC%29%EB%B8%8C%EB%A6%BF%EC%A7%80%EB%85%B8%EB%B0%94',
    anonymous_safe: true,
    requires_auth: false,
    requires_captcha: false,
    is_mutating: false,
    description: 'GetO sample public detail page discovered from the Seoul/Gangnam list',
  },
  district_list_json: {
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
  },
}

export const PICA_TARGETS: Record<string, CaptureTargetSpec> = {
  main_html: {
    target_id: 'main_html',
    method: 'GET',
    url: 'https://www.picaplay.com/pcbang/main.do',
    anonymous_safe: true,
    requires_auth: false,
    requires_captcha: false,
    is_mutating: false,
    description: 'Pica public PC방 main page',
  },
  franchise_list_html: {
    target_id: 'franchise_list_html',
    method: 'GET',
    url: 'https://www.picaplay.com/common/pcbangList.do',
    anonymous_safe: true,
    requires_auth: false,
    requires_captcha: false,
    is_mutating: false,
    description: 'Pica public franchise PC방 list page',
  },
  main_pcbang_list_json: {
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
    description: 'Pica public POST JSON endpoint for PC방 listings',
  },
  notice_list_html: {
    target_id: 'notice_list_html',
    method: 'GET',
    url: 'https://www.picaplay.com/noticeList.do',
    anonymous_safe: true,
    requires_auth: false,
    requires_captcha: false,
    is_mutating: false,
    description: 'Pica public notice/customer-service page',
  },
}

export const SOURCE_PRESETS: Record<SourceId, SourcePreset> = {
  geto: {
    source_id: 'geto',
    targets: Object.values(GETO_TARGETS),
  },
  pica: {
    source_id: 'pica',
    targets: Object.values(PICA_TARGETS),
  },
}

export function getSourcePreset(sourceId: SourceId): SourcePreset {
  return SOURCE_PRESETS[sourceId]
}

export function getTargetsByIds(sourceId: SourceId, targetIds: string[]): CaptureTargetSpec[] {
  const preset = getSourcePreset(sourceId)
  const targetMap = new Map(preset.targets.map((target) => [target.target_id, target]))

  const missing = targetIds.filter((id) => !targetMap.has(id))
  if (missing.length > 0) {
    throw new Error(`unknown target_id(s) for ${sourceId}: ${missing.join(', ')}`)
  }

  return targetIds.map((id) => targetMap.get(id)!)
}

export function guardPresetSafety(preset: SourcePreset): void {
  for (const target of preset.targets) {
    if (!target.anonymous_safe) {
      throw new Error(`preset safety violation: target ${target.target_id} is not anonymous_safe`)
    }
    if (target.requires_auth) {
      throw new Error(`preset safety violation: target ${target.target_id} requires_auth`)
    }
    if (target.requires_captcha) {
      throw new Error(`preset safety violation: target ${target.target_id} requires_captcha`)
    }
    if (target.is_mutating) {
      throw new Error(`preset safety violation: target ${target.target_id} is mutating`)
    }
    if (target.method === 'POST') {
      if (!target.request_body || target.request_body.length === 0) {
        throw new Error(`preset safety violation: POST target ${target.target_id} is missing request_body`)
      }

      const contentType = target.request_headers?.['Content-Type'] ?? target.request_headers?.['content-type']
      if (!contentType) {
        throw new Error(`preset safety violation: POST target ${target.target_id} is missing Content-Type header`)
      }
    }
  }
}

export function buildPicaInfoDetailTarget(seq: number): CaptureTargetSpec {
  return {
    target_id: `detail_info_seq_${seq}`,
    method: 'GET',
    url: `https://www.picaplay.com/pcbang/info.do?PCBANG_SEQ=${seq}`,
    anonymous_safe: true,
    requires_auth: false,
    requires_captcha: false,
    is_mutating: false,
    description: `Pica info.do detail page for SEQ=${seq}`,
  }
}

export function buildPicaMapDetailTarget(seq: number): CaptureTargetSpec {
  return {
    target_id: `detail_map_seq_${seq}`,
    method: 'GET',
    url: `https://www.picaplay.com/pcbang/map.do?PCBANG_SEQ=${seq}`,
    anonymous_safe: true,
    requires_auth: false,
    requires_captcha: false,
    is_mutating: false,
    description: `Pica map.do detail page for SEQ=${seq}`,
  }
}
