import assert from 'node:assert/strict'
import { test } from 'bun:test'
import {
  GETO_TARGETS,
  PICA_TARGETS,
  SOURCE_PRESETS,
  getSourcePreset,
  getTargetsByIds,
  guardPresetSafety,
} from '@/lib/pcbang/raw/source-presets'

test('GetO includes the public district JSON endpoint with form body', () => {
  assert.equal(GETO_TARGETS.district_list_json.method, 'POST')
  assert.equal(GETO_TARGETS.district_list_json.url, 'https://www.playgeto.com/landing/pcbang_json.php')
  assert.equal(GETO_TARGETS.district_list_json.request_body, 'areaName1=%EC%84%9C%EC%9A%B8')
  assert.equal(
    GETO_TARGETS.district_list_json.request_headers?.['Content-Type'],
    'application/x-www-form-urlencoded; charset=UTF-8'
  )
})

test('GetO uses the real public PlayGetO host and safe flags', () => {
  const targets = Object.values(GETO_TARGETS)
  assert.equal(targets.every((t) => t.url.startsWith('https://www.playgeto.com/')), true)
  assert.equal(targets.every((t) => t.anonymous_safe), true)
  assert.equal(targets.every((t) => !t.requires_auth), true)
  assert.equal(targets.every((t) => !t.requires_captcha), true)
  assert.equal(targets.every((t) => !t.is_mutating), true)
})

test('Pica includes the known POST JSON endpoint', () => {
  assert.equal(PICA_TARGETS.main_pcbang_list_json.method, 'POST')
  assert.equal(PICA_TARGETS.main_pcbang_list_json.url, 'https://www.picaplay.com/pcbang/mainPcbangList.do')
  assert.equal(PICA_TARGETS.main_pcbang_list_json.request_body, 'currentPageNo=1')
  assert.equal(
    PICA_TARGETS.main_pcbang_list_json.request_headers?.['Content-Type'],
    'application/x-www-form-urlencoded; charset=UTF-8'
  )
})

test('Pica uses the real public PicaPlay host and safe flags', () => {
  const targets = Object.values(PICA_TARGETS)
  assert.equal(targets.every((t) => t.url.startsWith('https://www.picaplay.com/')), true)
  assert.equal(targets.every((t) => t.anonymous_safe), true)
  assert.equal(targets.every((t) => !t.requires_auth), true)
  assert.equal(targets.every((t) => !t.is_mutating), true)
})

test('getSourcePreset returns presets for both sources', () => {
  assert.equal(getSourcePreset('geto').source_id, 'geto')
  assert.equal(getSourcePreset('pica').source_id, 'pica')
  assert.ok(getSourcePreset('geto').targets.length > 0)
  assert.ok(getSourcePreset('pica').targets.length > 0)
})

test('getTargetsByIds returns matching targets and handles empty list', () => {
  const targets = getTargetsByIds('geto', ['landing_html', 'district_list_json'])
  assert.equal(targets.length, 2)
  assert.equal(targets[0].target_id, 'landing_html')
  assert.equal(targets[1].target_id, 'district_list_json')
  assert.equal(getTargetsByIds('geto', []).length, 0)
})

test('getTargetsByIds throws on unknown target ids', () => {
  assert.throws(() => getTargetsByIds('geto', ['unknown']), /unknown target_id/)
})

test('guardPresetSafety passes for valid presets', () => {
  assert.doesNotThrow(() => guardPresetSafety(SOURCE_PRESETS.geto))
  assert.doesNotThrow(() => guardPresetSafety(SOURCE_PRESETS.pica))
})

test('guardPresetSafety rejects non-anonymous, auth, and captcha targets', () => {
  assert.throws(
    () =>
      guardPresetSafety({
        source_id: 'geto',
        targets: [{ ...GETO_TARGETS.landing_html, anonymous_safe: false }],
      }),
    /not anonymous_safe/
  )

  assert.throws(
    () =>
      guardPresetSafety({
        source_id: 'geto',
        targets: [{ ...GETO_TARGETS.landing_html, requires_auth: true }],
      }),
    /requires_auth/
  )

  assert.throws(
    () =>
      guardPresetSafety({
        source_id: 'geto',
        targets: [{ ...GETO_TARGETS.landing_html, requires_captcha: true }],
      }),
    /requires_captcha/
  )
})

test('guardPresetSafety rejects unsafe POST shapes', () => {
  assert.throws(
    () =>
      guardPresetSafety({
        source_id: 'pica',
        targets: [{ ...PICA_TARGETS.main_pcbang_list_json, request_body: undefined }],
      }),
    /missing request_body/
  )

  assert.throws(
    () =>
      guardPresetSafety({
        source_id: 'pica',
        targets: [{ ...PICA_TARGETS.main_pcbang_list_json, request_headers: undefined }],
      }),
    /missing Content-Type header/
  )

  assert.throws(
    () =>
      guardPresetSafety({
        source_id: 'pica',
        targets: [{ ...PICA_TARGETS.main_pcbang_list_json, is_mutating: true }],
      }),
    /is mutating/
  )
})
