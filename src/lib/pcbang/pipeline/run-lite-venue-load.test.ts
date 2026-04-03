import assert from 'node:assert/strict'
import { test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runLiteVenueLoad } from '@/lib/pcbang/pipeline/run-lite-venue-load'
import type { SourceId } from '@/lib/pcbang/raw/dto'

function createMockSupabaseClient(
  existingVenues: {
    id: string
    name: string
    address_full: string
    address_district: string
    source_ids?: SourceId[] | null
  }[] = []
) {
  const state = {
    insertedRows: [] as unknown[],
    updatedRows: [] as { id: string; source_ids: SourceId[] | null }[],
  }

  return {
    state,
    client: {
      from: () => ({
        select: async () => ({
          data: existingVenues,
          error: null,
        }),
        insert: async (payload: unknown) => {
          state.insertedRows.push(payload)
          return { error: null }
        },
        update: (payload: { source_ids?: SourceId[] | null }) => ({
          eq: async (_field: string, id: string) => {
            state.updatedRows.push({
              id,
              source_ids: payload.source_ids ?? null,
            })
            return { error: null }
          },
        }),
      }),
    },
  }
}

test('runLiteVenueLoad summarizes valid, inserted, updated, and skipped records', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'lite-venue-load-test-'))

  try {
    const canonical = [
      {
        venue: {
          source: 'pica',
          source_id: 'pica:100',
          name: 'Lite Insert',
          location_text: '서울 강남구 테스트로 1',
          address_full: '서울 강남구 테스트로 1',
          address_district: '강남구',
          lat: 37.5,
          lng: 127.01,
          source_ids: ['pica'] satisfies SourceId[],
        },
        pricing_tiers: [],
      },
      {
        venue: {
          source: 'geto',
          source_id: 'geto:200',
          name: 'Lite Existing',
          location_text: '서울 서초구 테스트로 2',
          address_full: '서울 서초구 테스트로 2',
          address_district: '서초구',
          lat: 37.49,
          lng: 127.02,
          source_ids: ['geto'] satisfies SourceId[],
        },
        pricing_tiers: [],
      },
      {
        venue: {
          source: 'pica',
          source_id: 'pica:bad',
          name: 'Broken Venue',
          address_full: '',
          address_district: '강남구',
          lat: 37.48,
          lng: 127.03,
        },
        pricing_tiers: [],
      },
    ]

    const inputFile = join(tmpDir, 'canonical.json')
    await writeFile(inputFile, JSON.stringify(canonical, null, 2) + '\n', 'utf-8')

    const outputDir = join(tmpDir, 'output')
    const mockClient = createMockSupabaseClient([
      {
        id: 'existing-uuid',
        name: 'Lite Existing',
        address_full: '서울 서초구 테스트로 2',
        address_district: '서초구',
        source_ids: ['pica'],
      },
    ])

    const result = await runLiteVenueLoad({
      input_files: [inputFile],
      output_dir: outputDir,
      apply: false,
      supabase_client: mockClient.client as never,
    })

    assert.equal(result.summary.total_seen, 3)
    assert.equal(result.summary.valid, 2)
    assert.equal(result.summary.inserted, 1)
    assert.equal(result.summary.updated, 1)
    assert.equal(result.summary.skipped, 1)
    assert.equal(result.summary.errors, 0)
    assert.equal(result.summary.apply_ran, false)

    const validFile = JSON.parse(await readFile(join(outputDir, 'valid.json'), 'utf-8'))
    const toInsertFile = JSON.parse(await readFile(join(outputDir, 'to-insert.json'), 'utf-8'))
    const toUpdateFile = JSON.parse(await readFile(join(outputDir, 'to-update.json'), 'utf-8'))
    const skippedFile = JSON.parse(await readFile(join(outputDir, 'skipped.json'), 'utf-8'))

    assert.equal(validFile.length, 2)
    assert.equal(toInsertFile.length, 1)
    assert.equal(toUpdateFile.length, 1)
    assert.equal(skippedFile.length, 1)
    assert.equal(mockClient.state.insertedRows.length, 0)
    assert.equal(mockClient.state.updatedRows.length, 0)
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})

test('runLiteVenueLoad dedupes duplicate valid inputs and unions source provenance', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'lite-venue-load-test-'))

  try {
    const canonical = [
      {
        source: 'geto',
        source_id: 'geto:dup-1',
        name: 'Lite Duplicate',
        address_full: '서울 용산구 테스트로 5',
        address_district: '용산구',
        lat: 37.53,
        lng: 126.98,
        source_ids: ['pica'] satisfies SourceId[],
      },
      {
        source: 'pica',
        source_id: 'pica:dup-2',
        name: 'Lite Duplicate',
        address_full: '서울 용산구 테스트로 5',
        address_district: '용산구',
        lat: 37.53,
        lng: 126.98,
        source_ids: ['pica'] satisfies SourceId[],
      },
    ]

    const inputFile = join(tmpDir, 'canonical.json')
    await writeFile(inputFile, JSON.stringify(canonical, null, 2) + '\n', 'utf-8')

    const outputDir = join(tmpDir, 'output')

    const result = await runLiteVenueLoad({
      input_files: [inputFile],
      output_dir: outputDir,
      apply: false,
      supabase_client: createMockSupabaseClient().client as never,
    })

    assert.equal(result.summary.total_seen, 2)
    assert.equal(result.summary.valid, 1)
    assert.equal(result.summary.inserted, 1)
    assert.equal(result.summary.skipped, 1)
    assert.deepEqual(result.to_insert[0].venue.source_ids, ['pica', 'geto'])
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})

test('runLiteVenueLoad applies inserts and source provenance updates', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'lite-venue-load-test-'))

  try {
    const canonical = [
      {
        source: 'pica',
        source_id: 'pica:300',
        name: 'Lite Apply Insert',
        address_full: '서울 마포구 테스트로 3',
        address_district: '마포구',
        lat: 37.56,
        lng: 126.91,
        source_ids: ['pica'] satisfies SourceId[],
      },
      {
        source: 'geto',
        source_id: 'geto:400',
        name: 'Lite Apply Existing',
        address_full: '서울 종로구 테스트로 4',
        address_district: '종로구',
        lat: 37.57,
        lng: 126.99,
        source_ids: ['geto'] satisfies SourceId[],
      },
    ]

    const inputFile = join(tmpDir, 'canonical.json')
    await writeFile(inputFile, JSON.stringify(canonical, null, 2) + '\n', 'utf-8')

    const outputDir = join(tmpDir, 'output')
    const mockClient = createMockSupabaseClient([
      {
        id: 'existing-uuid',
        name: 'Lite Apply Existing',
        address_full: '서울 종로구 테스트로 4',
        address_district: '종로구',
        source_ids: ['pica'],
      },
    ])

    const result = await runLiteVenueLoad({
      input_files: [inputFile],
      output_dir: outputDir,
      apply: true,
      supabase_client: mockClient.client as never,
    })

    assert.equal(result.summary.inserted, 1)
    assert.equal(result.summary.updated, 1)
    assert.equal(result.summary.apply_ran, true)
    assert.equal(mockClient.state.insertedRows.length, 1)
    assert.equal(mockClient.state.updatedRows.length, 1)
    assert.deepEqual(mockClient.state.updatedRows[0], {
      id: 'existing-uuid',
      source_ids: ['pica', 'geto'],
    })
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})
