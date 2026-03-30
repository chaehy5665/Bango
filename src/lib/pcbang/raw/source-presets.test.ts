import assert from 'node:assert/strict'
import { test } from 'bun:test'
import {
  GETO_TARGETS,
  SOURCE_PRESETS,
  getSourcePreset,
  getTargetsByIds,
  guardPresetSafety,
} from '@/lib/pcbang/raw/source-presets'

test('GetO includes the public district JSON endpoint with form body', () => {
  const preset = getSourcePreset('geto')
  const district_target = preset.targets.find((t) => t.target_id === 'district_list_json')

  if (!district_target) {
    throw new Error('Expected district_list_json target in GetO preset')
  }

  assert.equal(district_target.method, 'POST')
  assert.equal(district_target.url, 'https://www.playgeto.com/landing/pcbang_json.php')
  assert.equal(district_target.request_body, 'areaName1=%EC%84%9C%EC%9A%B8')
  assert.equal(
    district_target.request_headers?.['Content-Type'],
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

test('Pica includes paginated list targets with configurable default', () => {
  const preset = getSourcePreset('pica')
  const list_targets = preset.targets.filter(
    (t) => t.target_id === 'main_pcbang_list_json' || t.target_id.startsWith('main_pcbang_list_page_')
  )
  assert.ok(list_targets.length > 1, 'Expected multiple paginated list targets')
  assert.ok(list_targets.length >= 20, 'Expected at least 20 list targets (default)')

  const page1 = list_targets.find((t) => t.target_id === 'main_pcbang_list_json')
  assert.ok(page1, 'Expected main_pcbang_list_json target')
  assert.equal(page1.method, 'POST')
  assert.equal(page1.url, 'https://www.picaplay.com/pcbang/mainPcbangList.do')
  assert.equal(page1.request_body, 'currentPageNo=1')
  assert.equal(
    page1.request_headers?.['Content-Type'],
    'application/x-www-form-urlencoded; charset=UTF-8'
  )
})

test('Pica preset respects custom max_pages config', () => {
  const preset = getSourcePreset('pica', { pica_max_pages: 3 })
  const list_targets = preset.targets.filter(
    (t) => t.target_id === 'main_pcbang_list_json' || t.target_id.startsWith('main_pcbang_list_page_')
  )
  assert.equal(list_targets.length, 3, 'Expected exactly 3 list targets with custom max_pages')
})

test('Pica uses the real public PicaPlay host and safe flags', () => {
  const preset = getSourcePreset('pica')
  assert.equal(preset.targets.every((t) => t.url.startsWith('https://www.picaplay.com/')), true)
  assert.equal(preset.targets.every((t) => t.anonymous_safe), true)
  assert.equal(preset.targets.every((t) => !t.requires_auth), true)
  assert.equal(preset.targets.every((t) => !t.is_mutating), true)
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
  const preset = getSourcePreset('pica')
  const page1_target = preset.targets.find((t) => t.target_id === 'main_pcbang_list_json')
  assert.ok(page1_target, 'Expected main_pcbang_list_json target')

  assert.throws(
    () =>
      guardPresetSafety({
        source_id: 'pica',
        targets: [{ ...page1_target, request_body: undefined }],
      }),
    /missing request_body/
  )

  assert.throws(
    () =>
      guardPresetSafety({
        source_id: 'pica',
        targets: [{ ...page1_target, request_headers: undefined }],
      }),
    /missing Content-Type header/
  )

  assert.throws(
    () =>
      guardPresetSafety({
        source_id: 'pica',
        targets: [{ ...page1_target, is_mutating: true }],
      }),
    /is mutating/
  )
})
