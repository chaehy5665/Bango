import { test } from 'bun:test'
import { parseGetoListHtml } from '@/lib/pcbang/parser/geto/parse-list'
import { parseGetoDetailHtml } from '@/lib/pcbang/parser/geto/parse-detail'
import type { CaptureBundle } from '@/lib/pcbang/parser/bundle-reader'

test('GetO List Parser: parses list HTML with shop_seq, name, and address', () => {
  const html = `
      <a href="/landing/pcbang_find_detail.html?shop_seq=1005076&s_target=A">
        <span title="테스트피씨방" class="add cursor">테스트피씨방</span>
      </a>
      <span class="add cursor" title="서울 강남구 강남대로 123">서울 강남구 강남대로 123</span>
    `

  const bundle: CaptureBundle = {
    target_id: 'seoul_gangnam_list_html',
    ordinal: 1,
    manifest: {} as CaptureBundle['manifest'],
    metadata: {} as CaptureBundle['metadata'],
    body: html,
    request_body: null,
  }

  const { candidates, diagnostics } = parseGetoListHtml(bundle)

  if (candidates.length !== 1) throw new Error(`Expected 1 candidate, got ${candidates.length}`)
  if (candidates[0].source_entity_key !== 'geto:1005076')
    throw new Error(`Wrong entity key: ${candidates[0].source_entity_key}`)
  if (candidates[0].name !== '테스트피씨방') throw new Error(`Wrong name: ${candidates[0].name}`)
  if (candidates[0].address_full !== '서울 강남구 강남대로 123')
    throw new Error(`Wrong address: ${candidates[0].address_full}`)
  if (candidates[0].address_district !== '강남구')
    throw new Error(`Wrong district: ${candidates[0].address_district}`)
  if (diagnostics.filter((d) => d.severity === 'error').length !== 0)
    throw new Error('Unexpected errors in diagnostics')
})

test('GetO List Parser: returns diagnostic when no shop_seq found', () => {
  const bundle: CaptureBundle = {
    target_id: 'seoul_gangnam_list_html',
    ordinal: 1,
    manifest: {} as CaptureBundle['manifest'],
    metadata: {} as CaptureBundle['metadata'],
    body: '<html></html>',
    request_body: null,
  }

  const { candidates, diagnostics } = parseGetoListHtml(bundle)

  if (candidates.length !== 0) throw new Error(`Expected 0 candidates, got ${candidates.length}`)
  if (!diagnostics.some((d) => d.message.includes('No shop_seq found')))
    throw new Error('Expected diagnostic about missing shop_seq')
})

test('GetO Detail Parser: parses detail HTML with name, address, and coordinates', () => {
  const html = `
      <h4>테스트피씨방
        <span class="icon p_icon"></span>
      </h4>
      <p>서울 강남구 강남대로 123 지하1층</p>
      <script>
        draw_map("37.512551076277", "127.02799753438");
      </script>
    `

  const bundle: CaptureBundle = {
    target_id: 'sample_detail_html',
    ordinal: 1,
    manifest: {} as CaptureBundle['manifest'],
    metadata: {
      request_url: 'https://example.com?shop_seq=1005076',
    } as CaptureBundle['metadata'],
    body: html,
    request_body: null,
  }

  const { candidates, diagnostics } = parseGetoDetailHtml(bundle)

  if (candidates.length !== 1) throw new Error(`Expected 1 candidate, got ${candidates.length}`)
  if (candidates[0].source_entity_key !== 'geto:1005076')
    throw new Error(`Wrong entity key: ${candidates[0].source_entity_key}`)
  if (candidates[0].name !== '테스트피씨방') throw new Error(`Wrong name: ${candidates[0].name}`)
  if (candidates[0].address_full !== '서울 강남구 강남대로 123 지하1층')
    throw new Error(`Wrong address: ${candidates[0].address_full}`)
  if (candidates[0].address_district !== '강남구')
    throw new Error(`Wrong district: ${candidates[0].address_district}`)
  if (candidates[0].lat !== 37.512551076277) throw new Error(`Wrong lat: ${candidates[0].lat}`)
  if (candidates[0].lng !== 127.02799753438) throw new Error(`Wrong lng: ${candidates[0].lng}`)
  if (diagnostics.filter((d) => d.severity === 'error').length !== 0)
    throw new Error('Unexpected errors in diagnostics')
})

test('GetO Detail Parser: returns diagnostic when no detail data extracted', () => {
  const bundle: CaptureBundle = {
    target_id: 'sample_detail_html',
    ordinal: 1,
    manifest: {} as CaptureBundle['manifest'],
    metadata: {
      request_url: 'https://example.com',
    } as CaptureBundle['metadata'],
    body: '<html></html>',
    request_body: null,
  }

  const { candidates, diagnostics } = parseGetoDetailHtml(bundle)

  if (candidates.length !== 0) throw new Error(`Expected 0 candidates, got ${candidates.length}`)
  if (!diagnostics.some((d) => d.message.includes('No detail data')))
    throw new Error(`Expected diagnostic about no detail data, got: ${JSON.stringify(diagnostics)}`)
})
