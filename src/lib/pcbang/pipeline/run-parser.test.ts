import assert from 'node:assert/strict'
import { test } from 'bun:test'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runParserPipeline } from '@/lib/pcbang/pipeline/run-parser'
import type { CaptureArtifactManifest, CaptureMetadata, RunManifest } from '@/lib/pcbang/raw/dto'

test('runParserPipeline reads a raw run and writes canonical parser output', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'pcbang-pipeline-test-'))

  try {
    const rawBaseDir = join(tmpDir, 'raw')
    const outputBaseDir = join(tmpDir, 'parser')
    const runId = 'fixture-run'
    const sourceId = 'geto'
    const runDir = join(rawBaseDir, sourceId, runId)
    const capturesDir = join(runDir, 'captures')

    await mkdir(capturesDir, { recursive: true })

    const captures: Array<{
      manifest: CaptureArtifactManifest
      metadata: CaptureMetadata
      body: string
    }> = [
      {
        manifest: {
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
        metadata: {
          schema_version: 1,
          target_id: 'seoul_gangnam_list_html',
          source_id: 'geto',
          captured_at: '2026-03-27T00:00:00.000Z',
          method: 'GET',
          request_url: 'https://www.playgeto.com/landing/pcbang_find_coupon.html',
          request_headers: [],
          request_body_sha256: null,
          request_body_size_bytes: 0,
          final_url: 'https://www.playgeto.com/landing/pcbang_find_coupon.html',
          status_code: 200,
          response_headers: [],
          content_type: 'text/html; charset=UTF-8',
          body_size_bytes: 0,
          body_sha256: 'list-sha',
          anonymous_safe: true,
          requires_auth: false,
          requires_captcha: false,
          is_mutating: false,
        },
        body: `
          <tr>
            <td>
              <a href="/landing/pcbang_find_detail.html?shop_seq=1005076&s_target=A">
                <span title="테스트피씨방" class="add cursor">테스트피씨방</span>
              </a>
            </td>
            <td>
              <span class="add cursor" title="서울 강남구 강남대로 123">서울 강남구 강남대로 123</span>
            </td>
          </tr>
        `,
      },
      {
        manifest: {
          schema_version: 1,
          target_id: 'sample_detail_html',
          ordinal: 2,
          captured_at: '2026-03-27T00:00:01.000Z',
          status_code: 200,
          body_size_bytes: 0,
          body_sha256: 'detail-sha',
          body_filename: 'body.html',
          metadata_filename: 'metadata.json',
          request_body_filename: null,
        },
        metadata: {
          schema_version: 1,
          target_id: 'sample_detail_html',
          source_id: 'geto',
          captured_at: '2026-03-27T00:00:01.000Z',
          method: 'GET',
          request_url: 'https://www.playgeto.com/landing/pcbang_find_detail.html?shop_seq=1005076',
          request_headers: [],
          request_body_sha256: null,
          request_body_size_bytes: 0,
          final_url: 'https://www.playgeto.com/landing/pcbang_find_detail.html?shop_seq=1005076',
          status_code: 200,
          response_headers: [],
          content_type: 'text/html; charset=UTF-8',
          body_size_bytes: 0,
          body_sha256: 'detail-sha',
          anonymous_safe: true,
          requires_auth: false,
          requires_captcha: false,
          is_mutating: false,
        },
        body: `
          <h4>테스트피씨방<span class="icon p_icon"></span></h4>
          <p>서울 강남구 강남대로 123 지하1층</p>
          <script>draw_map("37.512551076277", "127.02799753438");</script>
        `,
      },
    ]

    const runManifest: RunManifest = {
      schema_version: 1,
      run_id: runId,
      source_id: sourceId,
      started_at: '2026-03-27T00:00:00.000Z',
      completed_at: '2026-03-27T00:00:02.000Z',
      status: 'success',
      target_ids: captures.map((capture) => capture.manifest.target_id),
      success_count: captures.length,
      failure_count: 0,
      captures: captures.map((capture) => capture.manifest),
      errors: [],
    }

    await writeFile(join(runDir, 'run-manifest.json'), JSON.stringify(runManifest, null, 2) + '\n', 'utf-8')

    for (const capture of captures) {
      const captureDir = join(capturesDir, `${capture.manifest.ordinal}-${capture.manifest.target_id}`)
      await mkdir(captureDir, { recursive: true })
      await writeFile(join(captureDir, 'manifest.json'), JSON.stringify(capture.manifest, null, 2) + '\n', 'utf-8')
      await writeFile(join(captureDir, 'metadata.json'), JSON.stringify(capture.metadata, null, 2) + '\n', 'utf-8')
      await writeFile(join(captureDir, capture.manifest.body_filename), capture.body, 'utf-8')
    }

    const result = await runParserPipeline({
      source_id: 'geto',
      raw_run_id: runId,
      raw_base_dir: rawBaseDir,
      output_base_dir: outputBaseDir,
    })

    const canonical = JSON.parse(await readFile(result.canonical_path, 'utf-8')) as Array<{
      venue: {
        source: string
        source_id: string
        name: string
        address_full: string
        location_text: string
        address_district: string
        lat: number
        lng: number
        source_ids: string[]
        raw_metadata: {
          shop_seq: string
        }
      }
      pricing_tiers: unknown[]
    }>
    const manifest = JSON.parse(await readFile(result.manifest_path, 'utf-8')) as {
      success_count: number
      parsed_targets: string[]
    }

    assert.equal(manifest.success_count, 1)
    assert.equal(manifest.parsed_targets.length, 2)
    assert.equal(canonical.length, 1)
    assert.equal(canonical[0].venue.name, '테스트피씨방')
    assert.equal(canonical[0].venue.source, 'geto')
    assert.equal(canonical[0].venue.source_id, 'geto:1005076')
    assert.equal(canonical[0].venue.address_full, '서울 강남구 강남대로 123 지하1층')
    assert.equal(canonical[0].venue.location_text, '서울 강남구 강남대로 123 지하1층')
    assert.equal(canonical[0].venue.address_district, '강남구')
    assert.equal(canonical[0].venue.lat, 37.512551076277)
    assert.equal(canonical[0].venue.lng, 127.02799753438)
    assert.deepEqual(canonical[0].venue.source_ids, ['geto'])
    assert.equal(canonical[0].venue.raw_metadata.shop_seq, '1005076')
    assert.equal(canonical[0].pricing_tiers.length, 0)
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})
