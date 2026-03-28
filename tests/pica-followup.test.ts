import { test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { extractPicaSeeds, filterSeoulSeeds, buildFollowupTargets } from '@/lib/pcbang/raw/pica-followup'
import { buildPicaInfoDetailTarget, buildPicaMapDetailTarget } from '@/lib/pcbang/raw/source-presets'
import type { RunManifest } from '@/lib/pcbang/raw/dto'

test('buildPicaInfoDetailTarget creates correct spec', () => {
  const target = buildPicaInfoDetailTarget(1306)

  if (target.target_id !== 'detail_info_seq_1306') {
    throw new Error(`Expected target_id 'detail_info_seq_1306', got '${target.target_id}'`)
  }

  if (target.url !== 'https://www.picaplay.com/pcbang/info.do?PCBANG_SEQ=1306') {
    throw new Error(`Unexpected URL: ${target.url}`)
  }

  if (target.method !== 'GET') {
    throw new Error(`Expected method GET, got ${target.method}`)
  }

  if (!target.anonymous_safe) {
    throw new Error('Expected anonymous_safe to be true')
  }

  if (target.requires_auth || target.requires_captcha || target.is_mutating) {
    throw new Error('Expected all safety flags to be safe')
  }
})

test('buildPicaMapDetailTarget creates correct spec', () => {
  const target = buildPicaMapDetailTarget(1306)

  if (target.target_id !== 'detail_map_seq_1306') {
    throw new Error(`Expected target_id 'detail_map_seq_1306', got '${target.target_id}'`)
  }

  if (target.url !== 'https://www.picaplay.com/pcbang/map.do?PCBANG_SEQ=1306') {
    throw new Error(`Unexpected URL: ${target.url}`)
  }

  if (target.method !== 'GET') {
    throw new Error(`Expected method GET, got ${target.method}`)
  }
})

test('filterSeoulSeeds filters by Seoul address', () => {
  const seeds = [
    { seq: 1, pcbang_id: 'test1', name: 'Test 1', address: '서울 강남구 테헤란로 123' },
    { seq: 2, pcbang_id: 'test2', name: 'Test 2', address: '경기 수원시 영통구 456' },
    { seq: 3, pcbang_id: 'test3', name: 'Test 3', address: '서울 마포구 789' },
  ]

  const filtered = filterSeoulSeeds(seeds)

  if (filtered.length !== 2) {
    throw new Error(`Expected 2 Seoul seeds, got ${filtered.length}`)
  }

  if (filtered[0].seq !== 1 || filtered[1].seq !== 3) {
    throw new Error('Expected Seoul seeds with seq 1 and 3')
  }
})

test('buildFollowupTargets creates info and map targets', () => {
  const seeds = [
    { seq: 100, pcbang_id: 'test100', name: 'Test', address: 'Test Address' },
    { seq: 200, pcbang_id: 'test200', name: 'Test2', address: 'Test Address 2' },
  ]

  const targets = buildFollowupTargets(seeds)

  if (targets.length !== 4) {
    throw new Error(`Expected 4 targets (2 info + 2 map), got ${targets.length}`)
  }

  const target_ids = targets.map((t) => t.target_id)
  const expected = ['detail_info_seq_100', 'detail_map_seq_100', 'detail_info_seq_200', 'detail_map_seq_200']

  for (const expected_id of expected) {
    if (!target_ids.includes(expected_id)) {
      throw new Error(`Expected target_id '${expected_id}' not found`)
    }
  }
})

test('extractPicaSeeds reads SEQ-backed venues from an existing raw run', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'pcbang-pica-followup-test-'))

  try {
    const runDir = join(tmpDir, 'pica', 'seed-run')
    const captureDir = join(runDir, 'captures', '1-main_pcbang_list_json')
    await mkdir(captureDir, { recursive: true })

    const manifest: RunManifest = {
      schema_version: 1,
      run_id: 'seed-run',
      source_id: 'pica',
      started_at: '2026-03-27T00:00:00.000Z',
      completed_at: '2026-03-27T00:00:01.000Z',
      status: 'success',
      target_ids: ['main_pcbang_list_json'],
      success_count: 1,
      failure_count: 0,
      captures: [
        {
          schema_version: 1,
          target_id: 'main_pcbang_list_json',
          ordinal: 1,
          captured_at: '2026-03-27T00:00:00.000Z',
          status_code: 200,
          body_size_bytes: 0,
          body_sha256: 'seed-sha',
          body_filename: 'body.json',
          metadata_filename: 'metadata.json',
          request_body_filename: 'request-body.txt',
        },
      ],
      errors: [],
    }

    const body = {
      result: 1,
      pcbangList: [
        {
          SEQ: 1306,
          PCBANGID: 'twix5225',
          PCBANGNAME: '도깨비1',
          ADDRESS: '서울 성동구 마조로1가길 4 (행당동) 지하1층',
        },
      ],
    }

    await writeFile(join(runDir, 'run-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf-8')
    await writeFile(join(captureDir, 'body.json'), JSON.stringify(body), 'utf-8')

    const seeds = await extractPicaSeeds(tmpDir, 'seed-run')
    if (seeds.length !== 1) {
      throw new Error(`Expected 1 seed, got ${seeds.length}`)
    }

    if (seeds[0].seq !== 1306 || seeds[0].pcbang_id !== 'twix5225') {
      throw new Error(`Unexpected seed payload: ${JSON.stringify(seeds[0])}`)
    }
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})
