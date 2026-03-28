import { test } from 'bun:test'
import { parsePicaDetailInfo, parsePicaDetailMap } from '@/lib/pcbang/parser/pica/parse-detail'
import type { CaptureBundle } from '@/lib/pcbang/parser/bundle-reader'
import type { CaptureArtifactManifest, CaptureMetadata } from '@/lib/pcbang/raw/dto'

function createBundle(target_id: string, body: string): CaptureBundle {
  const manifest: CaptureArtifactManifest = {
    schema_version: 1,
    target_id,
    ordinal: 1,
    captured_at: '2026-03-27T00:00:00.000Z',
    status_code: 200,
    body_size_bytes: body.length,
    body_sha256: 'test-sha',
    body_filename: 'body.html',
    metadata_filename: 'metadata.json',
    request_body_filename: null,
  }

  const metadata: CaptureMetadata = {
    schema_version: 1,
    target_id,
    source_id: 'pica',
    captured_at: '2026-03-27T00:00:00.000Z',
    method: 'GET',
    request_url: `https://www.picaplay.com/pcbang/${target_id.includes('map') ? 'map' : 'info'}.do?PCBANG_SEQ=1306`,
    request_headers: [],
    request_body_sha256: null,
    request_body_size_bytes: 0,
    final_url: `https://www.picaplay.com/pcbang/${target_id.includes('map') ? 'map' : 'info'}.do?PCBANG_SEQ=1306`,
    status_code: 200,
    response_headers: [],
    content_type: 'text/html; charset=UTF-8',
    body_size_bytes: body.length,
    body_sha256: 'test-sha',
    anonymous_safe: true,
    requires_auth: false,
    requires_captcha: false,
    is_mutating: false,
  }

  return {
    target_id,
    ordinal: 1,
    manifest,
    metadata,
    body,
    request_body: null,
  }
}

test('parsePicaDetailMap extracts coordinates from daum.maps.LatLng', () => {
  const html = `
    <script>
      var position = new daum.maps.LatLng("37.5665", "126.9780");
      map.setCenter(position);
    </script>
  `

  const bundle = createBundle('detail_map_seq_1306', html)

  const { candidates } = parsePicaDetailMap(bundle)

  if (candidates.length !== 1) {
    throw new Error(`Expected 1 candidate, got ${candidates.length}`)
  }

  const candidate = candidates[0]
  if (candidate.source_entity_key !== 'pica:1306') {
    throw new Error(`Expected source_entity_key 'pica:1306', got '${candidate.source_entity_key}'`)
  }

  if (candidate.lat !== 37.5665) {
    throw new Error(`Expected lat 37.5665, got ${candidate.lat}`)
  }

  if (candidate.lng !== 126.9780) {
    throw new Error(`Expected lng 126.9780, got ${candidate.lng}`)
  }
})

test('parsePicaDetailMap handles missing coordinates', () => {
  const html = `<div>No map coordinates here</div>`

  const bundle = createBundle('detail_map_seq_1306', html)

  const { candidates, diagnostics } = parsePicaDetailMap(bundle)

  if (candidates.length !== 0) {
    throw new Error(`Expected 0 candidates, got ${candidates.length}`)
  }

  const coord_warning = diagnostics.find((d) => d.message.includes('coordinates'))
  if (!coord_warning) {
    throw new Error('Expected diagnostic about missing coordinates')
  }
})

test('parsePicaDetailInfo extracts name and address', () => {
  const html = `
    <div class="pop-top">
      <div class="left">
        <h2 class="tit-pop">도깨비1</h2>
      </div>
      <div class="right">
        <p>서울 성동구 마조로1가길 4 (행당동) 지하1층</p>
      </div>
    </div>
    <div class="box-txt"><p>도깨비pc방입니다<br />전좌석 I5 10400</p></div>
    <div class="wrap-item">
      <span class="item"><span>프린트</span></span>
      <span class="item"><span>스마트폰충전</span></span>
    </div>
  `

  const bundle = createBundle('detail_info_seq_1306', html)

  const { candidates } = parsePicaDetailInfo(bundle)

  if (candidates.length !== 1) {
    throw new Error(`Expected 1 candidate, got ${candidates.length}`)
  }

  const candidate = candidates[0]
  if (candidate.name !== '도깨비1') {
    throw new Error(`Expected name '도깨비1', got '${candidate.name}'`)
  }

  if (!candidate.address_full || !candidate.address_full.includes('서울 성동구')) {
    throw new Error(`Expected address to include '서울 성동구', got '${candidate.address_full}'`)
  }

  if (candidate.address_district !== '성동구') {
    throw new Error(`Expected district '성동구', got '${candidate.address_district}'`)
  }

  if (candidate.source_entity_key !== 'pica:1306') {
    throw new Error(`Expected source_entity_key 'pica:1306', got '${candidate.source_entity_key}'`)
  }

  if (!candidate.raw_metadata || candidate.raw_metadata.intro !== '도깨비pc방입니다\n전좌석 I5 10400') {
    throw new Error(`Expected intro text in raw_metadata, got '${JSON.stringify(candidate.raw_metadata)}'`)
  }

  if (!candidate.amenities || candidate.amenities.length !== 2 || !candidate.amenities.includes('프린트')) {
    throw new Error(`Expected amenities to be parsed, got '${JSON.stringify(candidate.amenities)}'`)
  }
})

test('parsePicaDetailInfo handles missing fields gracefully', () => {
  const html = `<div>Incomplete data</div>`

  const bundle = createBundle('detail_info_seq_1306', html)

  const { candidates, diagnostics } = parsePicaDetailInfo(bundle)

  if (candidates.length !== 0) {
    throw new Error(`Expected 0 candidates, got ${candidates.length}`)
  }

  const warning = diagnostics.find((d) => d.message.includes('name or address'))
  if (!warning) {
    throw new Error('Expected diagnostic about missing name or address')
  }
})
