import { test } from 'bun:test'
import { parsePicaListJson } from '@/lib/pcbang/parser/pica/parse-list'
import type { CaptureBundle } from '@/lib/pcbang/parser/bundle-reader'

test('Pica List Parser: parses JSON list with venue data', () => {
  const json = {
    result: 1,
    pcbangList: [
      {
        PCBANGID: 'test123',
        PCBANGNAME: '테스트피씨방',
        ADDRESS: '서울 강남구 테헤란로 123',
        SEQ: 1001,
      },
      {
        PCBANGID: 'test456',
        PCBANGNAME: '샘플피씨',
        ADDRESS: '경기 성남시 분당구 판교역로 456',
        SEQ: 1002,
      },
    ],
  }

  const bundle: CaptureBundle = {
    target_id: 'main_pcbang_list_json',
    ordinal: 1,
    manifest: {} as CaptureBundle['manifest'],
    metadata: {} as CaptureBundle['metadata'],
    body: json,
    request_body: null,
  }

  const { candidates, diagnostics } = parsePicaListJson(bundle)

  if (candidates.length !== 2) throw new Error(`Expected 2 candidates, got ${candidates.length}`)
  if (candidates[0].source_entity_key !== 'pica:1001')
    throw new Error(`Wrong entity key: ${candidates[0].source_entity_key}`)
  if (candidates[0].name !== '테스트피씨방') throw new Error(`Wrong name: ${candidates[0].name}`)
  if (candidates[0].address_full !== '서울 강남구 테헤란로 123')
    throw new Error(`Wrong address: ${candidates[0].address_full}`)
  if (candidates[0].address_district !== '강남구')
    throw new Error(`Wrong district: ${candidates[0].address_district}`)
  if (diagnostics.filter((d) => d.severity === 'error').length !== 0)
    throw new Error('Unexpected errors in diagnostics')
})

test('Pica List Parser: returns error when pcbangList is not an array', () => {
  const json = {
    result: 1,
    pcbangList: 'invalid',
  }

  const bundle: CaptureBundle = {
    target_id: 'main_pcbang_list_json',
    ordinal: 1,
    manifest: {} as CaptureBundle['manifest'],
    metadata: {} as CaptureBundle['metadata'],
    body: json,
    request_body: null,
  }

  const { candidates, diagnostics } = parsePicaListJson(bundle)

  if (candidates.length !== 0) throw new Error(`Expected 0 candidates, got ${candidates.length}`)
  if (!diagnostics.some((d) => d.severity === 'error' && d.message.includes('not an array')))
    throw new Error('Expected error diagnostic about invalid pcbangList')
})

test('Pica List Parser: skips records with missing required fields', () => {
  const json = {
    result: 1,
    pcbangList: [
      {
        PCBANGID: 'valid123',
        PCBANGNAME: '유효한피씨방',
        ADDRESS: '서울 강남구 테헤란로 123',
        SEQ: 2001,
      },
      {
        PCBANGID: 'invalid',
      },
    ],
  }

  const bundle: CaptureBundle = {
    target_id: 'main_pcbang_list_json',
    ordinal: 1,
    manifest: {} as CaptureBundle['manifest'],
    metadata: {} as CaptureBundle['metadata'],
    body: json,
    request_body: null,
  }

  const { candidates, diagnostics } = parsePicaListJson(bundle)

  if (candidates.length !== 1) throw new Error(`Expected 1 candidate, got ${candidates.length}`)
  if (candidates[0].source_entity_key !== 'pica:2001')
    throw new Error(`Wrong entity key: ${candidates[0].source_entity_key}`)
  if (!diagnostics.some((d) => d.severity === 'warning' && d.message.includes('missing required')))
    throw new Error('Expected warning diagnostic about missing fields')
})
