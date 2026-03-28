import type { PcbangSampleVenue, SourceRubric } from '@/lib/pcbang/dto'

export const SEOUL_SAMPLE_SIZE = 20

export const WAVE1_SOURCE_RUBRIC: SourceRubric = {
  city: 'seoul',
  sample_size: 20,
  legal_gate: {
    no_captcha_bypass: true,
    no_mfa_bypass: true,
    no_anti_bot_evasion: true,
    automation_permitted_only: true,
  },
  thresholds: {
    identity_recoverable_min: 16,
    pricing_recoverable_min: 0,
    selector_navigation_stability_min: 18,
    median_acquisition_seconds_max: 15,
  },
}

export const SEOUL_SAMPLE_PANEL: PcbangSampleVenue[] = [
  {
    sample_id: 'seoul-001',
    name: '레전드 PC방 강남역점',
    address_full: '서울특별시 강남구 강남대로 396',
    address_district: '강남구',
    lat: 37.4979,
    lng: 127.0286,
  },
  {
    sample_id: 'seoul-002',
    name: '역삼 프로게이머 PC방',
    address_full: '서울특별시 강남구 테헤란로 212',
    address_district: '강남구',
    lat: 37.5009,
    lng: 127.0369,
  },
  {
    sample_id: 'seoul-003',
    name: '서초 메가 게임존',
    address_full: '서울특별시 서초구 서초대로 396',
    address_district: '서초구',
    lat: 37.4838,
    lng: 127.0276,
  },
  {
    sample_id: 'seoul-004',
    name: '봉천 프리미엄 PC카페',
    address_full: '서울특별시 관악구 봉천로 617',
    address_district: '관악구',
    lat: 37.4821,
    lng: 126.9422,
  },
  {
    sample_id: 'seoul-005',
    name: '홍대 게이밍존 PC방',
    address_full: '서울특별시 마포구 와우산로 94',
    address_district: '마포구',
    lat: 37.5563,
    lng: 126.9237,
  },
  {
    sample_id: 'seoul-006',
    name: '마포 디지털 게임월드',
    address_full: '서울특별시 마포구 마포대로 122',
    address_district: '마포구',
    lat: 37.5446,
    lng: 126.9053,
  },
  {
    sample_id: 'seoul-007',
    name: '종로 스타 PC라운지',
    address_full: '서울특별시 종로구 종로 119',
    address_district: '종로구',
    lat: 37.5702,
    lng: 126.991,
  },
  {
    sample_id: 'seoul-008',
    name: '종로 프리미엄 게임존',
    address_full: '서울특별시 종로구 종로 189',
    address_district: '종로구',
    lat: 37.5729,
    lng: 126.9784,
  },
  {
    sample_id: 'seoul-009',
    name: '잠실 오버워치 아레나 PC방',
    address_full: '서울특별시 송파구 올림픽로 269',
    address_district: '송파구',
    lat: 37.5133,
    lng: 127.1001,
  },
  {
    sample_id: 'seoul-010',
    name: '문정 디지털 PC카페',
    address_full: '서울특별시 송파구 문정로 168',
    address_district: '송파구',
    lat: 37.4858,
    lng: 127.122,
  },
  {
    sample_id: 'seoul-011',
    name: '영등포 프로게이머 PC클럽',
    address_full: '서울특별시 영등포구 영중로 12',
    address_district: '영등포구',
    lat: 37.5186,
    lng: 126.9035,
  },
  {
    sample_id: 'seoul-012',
    name: '여의도 비즈니스 PC방',
    address_full: '서울특별시 영등포구 의사당대로 83',
    address_district: '영등포구',
    lat: 37.5219,
    lng: 126.9244,
  },
  {
    sample_id: 'seoul-013',
    name: '건대 디지털 게임월드 PC방',
    address_full: '서울특별시 광진구 아차산로 240',
    address_district: '광진구',
    lat: 37.54,
    lng: 127.0686,
  },
  {
    sample_id: 'seoul-014',
    name: '광진 프로 게이밍존',
    address_full: '서울특별시 광진구 천호대로 585',
    address_district: '광진구',
    lat: 37.5388,
    lng: 127.0834,
  },
  {
    sample_id: 'seoul-015',
    name: '신촌 플래티넘 PC카페',
    address_full: '서울특별시 서대문구 연세로 27',
    address_district: '서대문구',
    lat: 37.5568,
    lng: 126.9368,
  },
  {
    sample_id: 'seoul-016',
    name: '서대문 플래티넘 PC카페',
    address_full: '서울특별시 서대문구 통일로 484',
    address_district: '서대문구',
    lat: 37.5794,
    lng: 126.9368,
  },
  {
    sample_id: 'seoul-017',
    name: '노원 넥스트레벨 PC방',
    address_full: '서울특별시 노원구 동일로 1414',
    address_district: '노원구',
    lat: 37.6542,
    lng: 127.061,
  },
  {
    sample_id: 'seoul-018',
    name: '강북 디지털 PC존',
    address_full: '서울특별시 강북구 도봉로 170',
    address_district: '강북구',
    lat: 37.6393,
    lng: 127.0256,
  },
  {
    sample_id: 'seoul-019',
    name: '은평 게이머스 스테이션',
    address_full: '서울특별시 은평구 은평로 211',
    address_district: '은평구',
    lat: 37.6178,
    lng: 126.9229,
  },
  {
    sample_id: 'seoul-020',
    name: '구로 메가비트 PC방',
    address_full: '서울특별시 구로구 디지털로32길 79',
    address_district: '구로구',
    lat: 37.4954,
    lng: 126.8874,
  },
]

export function getSeoulSamplePanel(sampleSize: number): PcbangSampleVenue[] {
  if (sampleSize > SEOUL_SAMPLE_PANEL.length) {
    throw new Error(`sample-size must be <= ${SEOUL_SAMPLE_PANEL.length}`)
  }

  return SEOUL_SAMPLE_PANEL.slice(0, sampleSize)
}
