import assert from 'node:assert/strict'
import { test } from 'bun:test'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runLoadPolicyClassifier } from '@/lib/pcbang/pipeline/run-load-policy'

test('runLoadPolicyClassifier writes summary and split artifacts', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'pcbang-load-policy-test-'))

  try {
    const parserBaseDir = join(tmpDir, 'parser')
    const outputBaseDir = join(tmpDir, 'load-policy')
    const sourceId = 'geto'
    const runId = 'fixture-run'
    const parserRunDir = join(parserBaseDir, sourceId, runId)
    await mkdir(parserRunDir, { recursive: true })

    const canonical = [
      {
        venue: {
          name: '테스트 PC방',
          address_full: '서울 강남구 테헤란로 123',
          address_district: '강남구',
          lat: 37.5,
          lng: 127,
        },
        pricing_tiers: [
          {
            tier_name: '일반석',
            pricing: {
              hourly: 1000,
              package_3h: null,
              package_6h: null,
              package_overnight: null,
              notes: null,
            },
          },
        ],
      },
    ]

    await writeFile(join(parserRunDir, 'canonical.json'), JSON.stringify(canonical, null, 2) + '\n', 'utf-8')

    const summary = await runLoadPolicyClassifier({
      source_id: sourceId,
      run_id: runId,
      parser_base_dir: parserBaseDir,
      output_base_dir: outputBaseDir,
    })

    assert.equal(summary.incoming_count, 1)
    assert.equal(summary.insertable_venues_count, 1)
    assert.equal(summary.insertable_pricing_count, 1)
    assert.equal(summary.errors_count, 0)

    const summaryFile = JSON.parse(await readFile(join(outputBaseDir, sourceId, runId, 'summary.json'), 'utf-8'))
    const insertableFile = JSON.parse(await readFile(join(outputBaseDir, sourceId, runId, 'insertable.json'), 'utf-8'))

    assert.equal(summaryFile.insertable_venues_count, 1)
    assert.equal(insertableFile.venues.length, 1)
    assert.equal(insertableFile.pricing.length, 1)
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})

test('runLoadPolicyClassifier preserves venue-only insertability when pricing is absent', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'pcbang-load-policy-test-'))

  try {
    const parserBaseDir = join(tmpDir, 'parser')
    const outputBaseDir = join(tmpDir, 'load-policy')
    const sourceId = 'pica'
    const runId = 'venue-only-run'
    const parserRunDir = join(parserBaseDir, sourceId, runId)
    await mkdir(parserRunDir, { recursive: true })

    const canonical = [
      {
        venue: {
          name: '도깨비1',
          address_full: '서울 성동구 마조로1가길 4 (행당동) 지하1층',
          address_district: '성동구',
          lat: 37.5602764621,
          lng: 127.0395815406,
        },
        pricing_tiers: [],
      },
    ]

    await writeFile(join(parserRunDir, 'canonical.json'), JSON.stringify(canonical, null, 2) + '\n', 'utf-8')

    const summary = await runLoadPolicyClassifier({
      source_id: sourceId,
      run_id: runId,
      parser_base_dir: parserBaseDir,
      output_base_dir: outputBaseDir,
    })

    assert.equal(summary.incoming_count, 1)
    assert.equal(summary.insertable_venues_count, 1)
    assert.equal(summary.insertable_pricing_count, 0)
    assert.equal(summary.errors_count, 0)

    const insertableFile = JSON.parse(await readFile(join(outputBaseDir, sourceId, runId, 'insertable.json'), 'utf-8'))
    const errorsFile = JSON.parse(await readFile(join(outputBaseDir, sourceId, runId, 'errors.json'), 'utf-8'))

    assert.equal(insertableFile.venues.length, 1)
    assert.equal(insertableFile.pricing.length, 0)
    assert.equal(errorsFile.length, 0)
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})
