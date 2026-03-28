import assert from 'node:assert/strict'
import { test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runVenueImport } from '@/lib/pcbang/pipeline/run-venue-import'

function createMockSupabaseClient(existingVenues: { id: string; name: string; address_full: string; address_district: string }[] = []) {
  return {
    from: () => ({
      select: () => ({
        then: (resolve: (result: { data: unknown[]; error: null }) => void) => {
          resolve({ data: existingVenues, error: null })
        }
      }),
      insert: () => ({
        then: (resolve: (result: { error: null }) => void) => {
          resolve({ error: null })
        }
      })
    })
  }
}

test('runVenueImport dry-run produces correct summary and artifacts', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'venue-import-test-'))

  try {
    const insertable = {
      venues: [
        {
          dedupe_key: 'test1::seoul gangnam-gu test st 123::gangnam-gu',
          venue: {
            name: 'Test1',
            address_full: 'Seoul Gangnam-gu Test St 123',
            address_district: 'Gangnam-gu',
            lat: 37.5,
            lng: 127.0
          }
        },
        {
          dedupe_key: 'test2::seoul seocho-gu test st 456::seocho-gu',
          venue: {
            name: 'Test2',
            address_full: 'Seoul Seocho-gu Test St 456',
            address_district: 'Seocho-gu',
            lat: 37.4,
            lng: 127.1
          }
        }
      ],
      pricing: []
    }

    const inputFile = join(tmpDir, 'insertable.json')
    await writeFile(inputFile, JSON.stringify(insertable, null, 2) + '\n', 'utf-8')

    const outputDir = join(tmpDir, 'output')

    const result = await runVenueImport({
      input_files: [inputFile],
      output_dir: outputDir,
      apply: false,
      supabase_client: createMockSupabaseClient() as never
    })

    assert.equal(result.summary.input_venue_count, 2)
    assert.equal(result.summary.deduped_insert_count, 2)
    assert.equal(result.summary.already_present_count, 0)
    assert.equal(result.summary.error_count, 0)
    assert.equal(result.summary.apply_ran, false)

    const summaryFile = JSON.parse(await readFile(join(outputDir, 'summary.json'), 'utf-8'))
    const toInsertFile = JSON.parse(await readFile(join(outputDir, 'to-insert.json'), 'utf-8'))

    assert.equal(summaryFile.input_venue_count, 2)
    assert.equal(toInsertFile.length, 2)
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})

test('runVenueImport deduplicates against existing venues', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'venue-import-test-'))

  try {
    const insertable = {
      venues: [
        {
          dedupe_key: 'test1::seoul gangnamgu test st 123::gangnam-gu',
          venue: {
            name: 'Test1',
            address_full: 'Seoul Gangnam-gu Test St 123',
            address_district: 'Gangnam-gu',
            lat: 37.5,
            lng: 127.0
          }
        },
        {
          dedupe_key: 'existing::seoul seochogu existing st 1::seocho-gu',
          venue: {
            name: 'Existing',
            address_full: 'Seoul Seocho-gu Existing St 1',
            address_district: 'Seocho-gu',
            lat: 37.4,
            lng: 127.1
          }
        }
      ],
      pricing: []
    }

    const inputFile = join(tmpDir, 'insertable.json')
    await writeFile(inputFile, JSON.stringify(insertable, null, 2) + '\n', 'utf-8')

    const outputDir = join(tmpDir, 'output')

    const mockClient = createMockSupabaseClient([
      {
        id: 'existing-uuid',
        name: 'Existing',
        address_full: 'Seoul Seocho-gu Existing St 1',
        address_district: 'Seocho-gu'
      }
    ])

    const result = await runVenueImport({
      input_files: [inputFile],
      output_dir: outputDir,
      apply: false,
      supabase_client: mockClient as never
    })

    assert.equal(result.summary.input_venue_count, 2)
    assert.equal(result.summary.deduped_insert_count, 1)
    assert.equal(result.summary.already_present_count, 1)

    const alreadyPresentFile = JSON.parse(await readFile(join(outputDir, 'already-present.json'), 'utf-8'))
    assert.equal(alreadyPresentFile.length, 1)
    assert.equal(alreadyPresentFile[0].existing_id, 'existing-uuid')
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})

test('runVenueImport handles multiple input files', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'venue-import-test-'))

  try {
    const insertable1 = {
      venues: [
        {
          dedupe_key: 'geto1::seoul gangnam-gu test st 123::gangnam-gu',
          venue: {
            name: 'GetO1',
            address_full: 'Seoul Gangnam-gu Test St 123',
            address_district: 'Gangnam-gu',
            lat: 37.5,
            lng: 127.0
          }
        }
      ],
      pricing: []
    }

    const insertable2 = {
      venues: [
        {
          dedupe_key: 'pica1::seoul seocho-gu test st 456::seocho-gu',
          venue: {
            name: 'Pica1',
            address_full: 'Seoul Seocho-gu Test St 456',
            address_district: 'Seocho-gu',
            lat: 37.4,
            lng: 127.1
          }
        }
      ],
      pricing: []
    }

    const inputFile1 = join(tmpDir, 'geto.json')
    const inputFile2 = join(tmpDir, 'pica.json')
    await writeFile(inputFile1, JSON.stringify(insertable1, null, 2) + '\n', 'utf-8')
    await writeFile(inputFile2, JSON.stringify(insertable2, null, 2) + '\n', 'utf-8')

    const outputDir = join(tmpDir, 'output')

    const result = await runVenueImport({
      input_files: [inputFile1, inputFile2],
      output_dir: outputDir,
      apply: false,
      supabase_client: createMockSupabaseClient() as never
    })

    assert.equal(result.summary.input_venue_count, 2)
    assert.equal(result.summary.duplicate_input_count, 0)
    assert.equal(result.summary.input_files.length, 2)
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})

test('runVenueImport deduplicates duplicate venues across input files', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'venue-import-test-'))

  try {
    const sharedVenue = {
      dedupe_key: 'shared::seoul mapo-gu test st 999::mapo-gu',
      venue: {
        name: 'SharedVenue',
        address_full: 'Seoul Mapo-gu Test St 999',
        address_district: 'Mapo-gu',
        lat: 37.55,
        lng: 126.92,
      },
    }

    const inputFile1 = join(tmpDir, 'file-1.json')
    const inputFile2 = join(tmpDir, 'file-2.json')
    await writeFile(inputFile1, JSON.stringify({ venues: [sharedVenue], pricing: [] }, null, 2) + '\n', 'utf-8')
    await writeFile(inputFile2, JSON.stringify({ venues: [sharedVenue], pricing: [] }, null, 2) + '\n', 'utf-8')

    const outputDir = join(tmpDir, 'output')
    const result = await runVenueImport({
      input_files: [inputFile1, inputFile2],
      output_dir: outputDir,
      apply: false,
      supabase_client: createMockSupabaseClient() as never,
    })

    assert.equal(result.summary.input_venue_count, 2)
    assert.equal(result.summary.duplicate_input_count, 1)
    assert.equal(result.summary.deduped_insert_count, 1)
    assert.equal(result.summary.error_count, 1)

    const toInsertFile = JSON.parse(await readFile(join(outputDir, 'to-insert.json'), 'utf-8'))
    const errorsFile = JSON.parse(await readFile(join(outputDir, 'errors.json'), 'utf-8'))

    assert.equal(toInsertFile.length, 1)
    assert.equal(errorsFile.length, 1)
    assert.equal(errorsFile[0].reason, 'duplicate_input_dedupe_key')
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
})
