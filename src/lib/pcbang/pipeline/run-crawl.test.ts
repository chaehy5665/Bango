import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'bun:test'
import { runCrawlWithDeps } from '@/lib/pcbang/pipeline/run-crawl'
import type { SourceId } from '@/lib/pcbang/raw/dto'
import type { CollectorResult } from '@/lib/pcbang/raw/collector'

function createCollectorResult(sourceId: SourceId, runId: string): CollectorResult {
  return {
    source_id: sourceId,
    run_id: runId,
    started_at: '2026-03-28T00:00:00.000Z',
    completed_at: '2026-03-28T00:00:01.000Z',
    success_count: 4,
    failure_count: 0,
    had_errors: false,
    manifest_path: `/tmp/${runId}/run-manifest.json`,
  }
}

test('runCrawlWithDeps rejects pica-only flags for geto', async () => {
  await assert.rejects(
    async () => {
      await runCrawlWithDeps(
        {
          source: 'geto',
          output_root: '/tmp/test-reject-limit',
          limit: 10,
        },
        {
          runCollector: async () => createCollectorResult('geto', 'noop'),
          runPicaFollowup: async () => createCollectorResult('pica', 'noop'),
          runGetoFollowup: async () => createCollectorResult('geto', 'noop'),
          fetchSeoulDistricts: async () => ({ districts: ['강남구'] }),
          runParserPipeline: async () => ({
            output_dir: '/tmp',
            manifest_path: '/tmp/parser-manifest.json',
            canonical_path: '/tmp/canonical.json',
            diagnostics_path: '/tmp/diagnostics.json',
          }),
          runLoadPolicyClassifier: async () => ({
            source_id: 'geto',
            run_id: 'noop',
            timestamp: '2026-03-28T00:00:00.000Z',
            incoming_count: 0,
            insertable_venues_count: 0,
            insertable_pricing_count: 0,
            review_needed_count: 0,
            skipped_count: 0,
            errors_count: 0,
          }),
          runVenueImport: async () => ({
            summary: {
              timestamp: '2026-03-28T00:00:00.000Z',
              input_files: [],
              input_venue_count: 0,
              duplicate_input_count: 0,
              deduped_insert_count: 0,
              already_present_count: 0,
              error_count: 0,
              apply_ran: false,
            },
            to_insert: [],
            already_present: [],
            errors: [],
          }),
        }
      )
    },
    {
      message: '--limit, --seoul-only, and --pica-max-pages are only valid for source=pica',
    }
  )
})

test('runCrawlWithDeps orchestrates geto dry-run and writes op summary', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'run-crawl-geto-'))
  const calls: string[] = []

  try {
    const summary = await runCrawlWithDeps(
      {
        source: 'geto',
        operation_id: 'verify-geto-ops',
        output_root: tmpDir,
      },
      {
        runCollector: async (config) => {
          calls.push(`collector:${config.source}:${config.run_id}`)
          
          if (config.run_id === 'verify-geto-ops-districts') {
            const districtDir = join(tmpDir, 'raw', 'geto', config.run_id)
            const districtCaptureDir = join(districtDir, 'captures', '1-district_list_json')
            await mkdir(districtCaptureDir, { recursive: true })
            
            const districtManifest = {
              schema_version: 1,
              run_id: config.run_id,
              source_id: 'geto',
              started_at: '2026-03-28T00:00:00.000Z',
              completed_at: '2026-03-28T00:00:01.000Z',
              status: 'success',
              target_ids: ['district_list_json'],
              success_count: 1,
              failure_count: 0,
              captures: [
                {
                  schema_version: 1,
                  target_id: 'district_list_json',
                  ordinal: 1,
                  captured_at: '2026-03-28T00:00:00.000Z',
                  status_code: 200,
                  body_size_bytes: 0,
                  body_sha256: 'district-sha',
                  body_filename: 'body.json',
                  metadata_filename: 'metadata.json',
                  request_body_filename: null,
                },
              ],
              errors: [],
            }
            
            const districtBody = {
              result: [
                { AREANAME2: '강남구' },
                { AREANAME2: '강서구' },
              ],
            }
            
            await writeFile(
              join(districtDir, 'run-manifest.json'),
              JSON.stringify(districtManifest, null, 2) + '\n',
              'utf-8'
            )
            await writeFile(
              join(districtCaptureDir, 'body.json'),
              JSON.stringify(districtBody),
              'utf-8'
            )
          }
          
          return {
            source_id: config.source,
            run_id: config.run_id,
            started_at: '2026-03-28T00:00:00.000Z',
            completed_at: '2026-03-28T00:00:01.000Z',
            success_count: config.run_id === 'verify-geto-ops-districts' ? 1 : 4,
            failure_count: 0,
            had_errors: false,
            manifest_path: join(tmpDir, 'raw', 'geto', config.run_id, 'run-manifest.json'),
          }
        },
        runPicaFollowup: async () => {
          throw new Error('pica followup should not run for geto')
        },
        runGetoFollowup: async (config) => {
          calls.push(`geto-followup:${config.from_run_id}:${config.run_id}`)
          return {
            source_id: 'geto',
            run_id: config.run_id!,
            started_at: '2026-03-28T00:00:01.000Z',
            completed_at: '2026-03-28T00:00:02.000Z',
            success_count: 2,
            failure_count: 0,
            had_errors: false,
            manifest_path: join(tmpDir, 'raw', 'geto', config.run_id!, 'run-manifest.json'),
          }
        },
        fetchSeoulDistricts: async () => ({ districts: ['강남구', '강서구', '마포구'] }),
        runParserPipeline: async (config) => {
          calls.push(`parser:${config.source_id}:${config.raw_run_id}`)
          return {
            output_dir: join(tmpDir, 'parser', 'geto', config.raw_run_id),
            manifest_path: join(tmpDir, 'parser', 'geto', config.raw_run_id, 'parser-manifest.json'),
            canonical_path: join(tmpDir, 'parser', 'geto', config.raw_run_id, 'canonical.json'),
            diagnostics_path: join(tmpDir, 'parser', 'geto', config.raw_run_id, 'diagnostics.json'),
          }
        },
        runLoadPolicyClassifier: async (config) => {
          calls.push(`load-policy:${config.source_id}:${config.run_id}`)
          return {
            source_id: config.source_id,
            run_id: config.run_id,
            timestamp: '2026-03-28T00:00:02.000Z',
            incoming_count: 1,
            insertable_venues_count: 1,
            insertable_pricing_count: 0,
            review_needed_count: 0,
            skipped_count: 0,
            errors_count: 0,
          }
        },
        runVenueImport: async (config) => {
          calls.push(`venue-import:${config.apply ? 'apply' : 'dry-run'}`)
          return {
            summary: {
              timestamp: '2026-03-28T00:00:03.000Z',
              input_files: config.input_files,
              input_venue_count: 1,
              duplicate_input_count: 0,
              deduped_insert_count: 1,
              already_present_count: 0,
              error_count: 0,
              apply_ran: false,
            },
            to_insert: [],
            already_present: [],
            errors: [],
          }
        },
      }
    )

    assert.deepEqual(calls, [
      'collector:geto:verify-geto-ops-raw',
      'geto-followup:verify-geto-ops-raw:verify-geto-ops-detail',
      'parser:geto:verify-geto-ops-detail',
      'load-policy:geto:verify-geto-ops-detail',
      'venue-import:dry-run',
    ])
    assert.equal(summary.stage_run_ids.raw_primary, 'verify-geto-ops-raw')
    assert.equal(summary.stage_run_ids.raw_detail, 'verify-geto-ops-detail')
    assert.equal(summary.apply_ran, false)
    assert.equal(summary.counts.raw_success, 6)

    const persisted = JSON.parse(
      await readFile(join(tmpDir, 'run', 'geto', 'verify-geto-ops', 'summary.json'), 'utf-8')
    ) as { operation_id: string; artifact_paths: { insertable: string } }
    assert.equal(persisted.operation_id, 'verify-geto-ops')
    assert.equal(
      persisted.artifact_paths.insertable,
      join(tmpDir, 'load-policy', 'geto', 'verify-geto-ops-detail', 'insertable.json')
    )
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})

test('runCrawlWithDeps orchestrates pica follow-up flow and apply propagation', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'run-crawl-pica-'))
  const calls: string[] = []

  try {
    const summary = await runCrawlWithDeps(
      {
        source: 'pica',
        operation_id: 'verify-pica-ops',
        output_root: tmpDir,
        limit: 5,
        seoul_only: true,
        apply: true,
      },
      {
        runCollector: async (config) => {
          calls.push(`collector:${config.source}:${config.run_id}`)
          return {
            source_id: config.source,
            run_id: config.run_id,
            started_at: '2026-03-28T00:00:00.000Z',
            completed_at: '2026-03-28T00:00:01.000Z',
            success_count: config.run_id.endsWith('-seed') ? 4 : 0,
            failure_count: 0,
            had_errors: false,
            manifest_path: join(tmpDir, 'raw', 'pica', config.run_id, 'run-manifest.json'),
          }
        },
        runPicaFollowup: async (config) => {
          calls.push(`pica-followup:${config.from_run_id}:${config.run_id}:${config.limit}:${config.seoul_only}`)
          return {
            source_id: 'pica',
            run_id: config.run_id!,
            started_at: '2026-03-28T00:00:02.000Z',
            completed_at: '2026-03-28T00:00:03.000Z',
            success_count: 10,
            failure_count: 0,
            had_errors: false,
            manifest_path: join(tmpDir, 'raw', 'pica', config.run_id!, 'run-manifest.json'),
          }
        },
        runGetoFollowup: async () => {
          throw new Error('geto followup should not run for pica')
        },
        fetchSeoulDistricts: async () => ({ districts: ['강남구'] }),
        runParserPipeline: async (config) => {
          calls.push(`parser:${config.source_id}:${config.raw_run_id}`)
          return {
            output_dir: join(tmpDir, 'parser', 'pica', config.raw_run_id),
            manifest_path: join(tmpDir, 'parser', 'pica', config.raw_run_id, 'parser-manifest.json'),
            canonical_path: join(tmpDir, 'parser', 'pica', config.raw_run_id, 'canonical.json'),
            diagnostics_path: join(tmpDir, 'parser', 'pica', config.raw_run_id, 'diagnostics.json'),
          }
        },
        runLoadPolicyClassifier: async (config) => {
          calls.push(`load-policy:${config.source_id}:${config.run_id}`)
          return {
            source_id: config.source_id,
            run_id: config.run_id,
            timestamp: '2026-03-28T00:00:04.000Z',
            incoming_count: 5,
            insertable_venues_count: 5,
            insertable_pricing_count: 0,
            review_needed_count: 0,
            skipped_count: 0,
            errors_count: 0,
          }
        },
        runVenueImport: async (config) => {
          calls.push(`venue-import:${config.apply ? 'apply' : 'dry-run'}:${config.input_files[0]}`)
          return {
            summary: {
              timestamp: '2026-03-28T00:00:05.000Z',
              input_files: config.input_files,
              input_venue_count: 5,
              duplicate_input_count: 0,
              deduped_insert_count: 2,
              already_present_count: 3,
              error_count: 0,
              apply_ran: true,
            },
            to_insert: [],
            already_present: [],
            errors: [],
          }
        },
      }
    )

    assert.deepEqual(calls, [
      'collector:pica:verify-pica-ops-seed',
      'pica-followup:verify-pica-ops-seed:verify-pica-ops-detail:5:true',
      'parser:pica:verify-pica-ops-detail',
      'load-policy:pica:verify-pica-ops-detail',
      `venue-import:apply:${join(tmpDir, 'load-policy', 'pica', 'verify-pica-ops-detail', 'insertable.json')}`,
    ])
    assert.equal(summary.stage_run_ids.raw_seed, 'verify-pica-ops-seed')
    assert.equal(summary.stage_run_ids.raw_detail, 'verify-pica-ops-detail')
    assert.equal(summary.apply_ran, true)
    assert.equal(summary.counts.raw_success, 14)
    assert.equal(summary.counts.already_present, 3)
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})
