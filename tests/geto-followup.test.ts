import { test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  extractGetoDetailTargets,
  buildGetoDetailTarget,
} from '@/lib/pcbang/raw/geto-followup'
import type { RunManifest } from '@/lib/pcbang/raw/dto'

test('buildGetoDetailTarget creates correct spec', () => {
  const target = buildGetoDetailTarget('1005076')

  if (target.target_id !== 'detail_shop_seq_1005076') {
    throw new Error(`Expected target_id 'detail_shop_seq_1005076', got '${target.target_id}'`)
  }

  if (
    target.url !==
    'https://www.playgeto.com/landing/pcbang_find_detail.html?shop_seq=1005076&s_target=A'
  ) {
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

test('buildGetoDetailTarget preserves full relative href when provided', () => {
  const target = buildGetoDetailTarget(
    '1005076',
    '/landing/pcbang_find_detail.html?shop_seq=1005076&s_target=A&region1=%EC%84%9C%EC%9A%B8&region2=%EA%B0%95%EB%82%A8%EA%B5%AC&shop_name=%28%EC%A3%BC%29%EB%B8%8C%EB%A6%BF%EC%A7%80%EB%85%B8%EB%B0%94'
  )

  if (!target.url.includes('region1=%EC%84%9C%EC%9A%B8')) {
    throw new Error(`Expected URL to preserve detail href query, got '${target.url}'`)
  }
})

test('extractGetoDetailTargets derives detail targets from list HTML', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'pcbang-geto-followup-test-'))

  try {
    const runDir = join(tmpDir, 'geto', 'list-run')
    const captureDir = join(runDir, 'captures', '1-seoul_gangnam_list_html')
    await mkdir(captureDir, { recursive: true })

    const manifest: RunManifest = {
      schema_version: 1,
      run_id: 'list-run',
      source_id: 'geto',
      started_at: '2026-03-27T00:00:00.000Z',
      completed_at: '2026-03-27T00:00:01.000Z',
      status: 'success',
      target_ids: ['seoul_gangnam_list_html'],
      success_count: 1,
      failure_count: 0,
      captures: [
        {
          schema_version: 1,
          target_id: 'seoul_gangnam_list_html',
          ordinal: 1,
          captured_at: '2026-03-27T00:00:00.000Z',
          status_code: 200,
          body_size_bytes: 0,
          body_sha256: 'list-sha',
          body_filename: 'body.html',
          metadata_filename: 'metadata.json',
          request_body_filename: null,
        },
      ],
      errors: [],
    }

    const html = `
      <a href="/landing/pcbang_find_detail.html?shop_seq=1005076&s_target=A&region1=%EC%84%9C%EC%9A%B8&region2=%EA%B0%95%EB%82%A8%EA%B5%AC">브릿지노바</a>
      <a href="/landing/pcbang_find_detail.html?shop_seq=2000123&s_target=A&region1=%EC%84%9C%EC%9A%B8&region2=%EA%B0%95%EB%82%A8%EA%B5%AC">테스트피씨방</a>
      <a href="/landing/pcbang_find_detail.html?shop_seq=1005076&s_target=A&region1=%EC%84%9C%EC%9A%B8&region2=%EA%B0%95%EB%82%A8%EA%B5%AC">브릿지노바 재출현</a>
    `

    await writeFile(join(runDir, 'run-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf-8')
    await writeFile(join(captureDir, 'body.html'), html, 'utf-8')

    const targets = await extractGetoDetailTargets(tmpDir, 'list-run')

    if (targets.length !== 2) {
      throw new Error(`Expected 2 unique detail targets, got ${targets.length}`)
    }

    const target_ids = targets.map((t) => t.target_id).sort()
    const expected_ids = ['detail_shop_seq_1005076', 'detail_shop_seq_2000123']

    if (JSON.stringify(target_ids) !== JSON.stringify(expected_ids)) {
      throw new Error(`Expected target_ids [${expected_ids.join(', ')}], got [${target_ids.join(', ')}]`)
    }

    const keeps_detail_query = targets.every(
      (t) => t.url.includes('shop_seq=') && t.url.includes('region1=%EC%84%9C%EC%9A%B8')
    )
    if (!keeps_detail_query) {
      throw new Error('Expected all targets to preserve full detail href query')
    }
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})

test('extractGetoDetailTargets handles multiple list pages with unique shop_seq dedupe', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'pcbang-geto-followup-multipage-'))

  try {
    const runDir = join(tmpDir, 'geto', 'list-run')
    const captureDir1 = join(runDir, 'captures', '1-seoul_gangnam_list_html')
    const captureDir2 = join(runDir, 'captures', '2-seoul_gangnam_page_2_list_html')
    await mkdir(captureDir1, { recursive: true })
    await mkdir(captureDir2, { recursive: true })

    const manifest: RunManifest = {
      schema_version: 1,
      run_id: 'list-run',
      source_id: 'geto',
      started_at: '2026-03-27T00:00:00.000Z',
      completed_at: '2026-03-27T00:00:01.000Z',
      status: 'success',
      target_ids: ['seoul_gangnam_list_html', 'seoul_gangnam_page_2_list_html'],
      success_count: 2,
      failure_count: 0,
      captures: [
        {
          schema_version: 1,
          target_id: 'seoul_gangnam_list_html',
          ordinal: 1,
          captured_at: '2026-03-27T00:00:00.000Z',
          status_code: 200,
          body_size_bytes: 0,
          body_sha256: 'list-sha-1',
          body_filename: 'body.html',
          metadata_filename: 'metadata.json',
          request_body_filename: null,
        },
        {
          schema_version: 1,
          target_id: 'seoul_gangnam_page_2_list_html',
          ordinal: 2,
          captured_at: '2026-03-27T00:00:01.000Z',
          status_code: 200,
          body_size_bytes: 0,
          body_sha256: 'list-sha-2',
          body_filename: 'body.html',
          metadata_filename: 'metadata.json',
          request_body_filename: null,
        },
      ],
      errors: [],
    }

    const html1 = `
      <a href="/landing/pcbang_find_detail.html?shop_seq=1005076&s_target=A">브릿지노바</a>
      <a href="/landing/pcbang_find_detail.html?shop_seq=2000123&s_target=A">테스트피씨방</a>
    `

    const html2 = `
      <a href="/landing/pcbang_find_detail.html?shop_seq=1005076&s_target=A">브릿지노바 재출현</a>
      <a href="/landing/pcbang_find_detail.html?shop_seq=3000456&s_target=A">다른피씨방</a>
    `

    await writeFile(join(runDir, 'run-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf-8')
    await writeFile(join(captureDir1, 'body.html'), html1, 'utf-8')
    await writeFile(join(captureDir2, 'body.html'), html2, 'utf-8')

    const targets = await extractGetoDetailTargets(tmpDir, 'list-run')

    if (targets.length !== 3) {
      throw new Error(`Expected 3 unique detail targets (deduped by shop_seq), got ${targets.length}`)
    }

    const target_ids = targets.map((t) => t.target_id).sort()
    const expected_ids = ['detail_shop_seq_1005076', 'detail_shop_seq_2000123', 'detail_shop_seq_3000456']

    if (JSON.stringify(target_ids) !== JSON.stringify(expected_ids)) {
      throw new Error(`Expected target_ids [${expected_ids.join(', ')}], got [${target_ids.join(', ')}]`)
    }
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})
