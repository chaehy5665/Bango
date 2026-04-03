import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { validateVenueContract } from '@/lib/pcbang/contracts/venue-contract'
import type { CanonicalVenueRecord, CanonicalVenueWithPricing } from '@/lib/pcbang/dto'
import { buildVenueDedupeKey } from '@/lib/pcbang/load-policy'
import type { SourceId } from '@/lib/pcbang/raw/dto'

interface ExistingVenueSnapshot {
  id: string
  name: string
  address_full: string
  address_district: string
  source_ids: SourceId[] | null
}

interface LiteValidVenue {
  dedupe_key: string
  venue: CanonicalVenueRecord
}

interface LiteUpdateVenue {
  dedupe_key: string
  venue_name: string
  existing_id: string
  existing_source_ids: SourceId[]
  incoming_source_ids: SourceId[]
  merged_source_ids: SourceId[]
}

interface LiteSkippedVenue {
  dedupe_key?: string
  venue_name?: string
  source_id?: string
  reason: string
  details?: string
  errors?: string[]
}

interface LiteErrorEntry {
  dedupe_key?: string
  venue_name?: string
  source_id?: string
  reason: string
  error: string
}

export interface LiteVenueLoadSummary {
  timestamp: string
  input_files: string[]
  total_seen: number
  valid: number
  inserted: number
  updated: number
  skipped: number
  errors: number
  apply_ran: boolean
}

export interface LiteVenueLoadResult {
  summary: LiteVenueLoadSummary
  valid_records: LiteValidVenue[]
  to_insert: LiteValidVenue[]
  to_update: LiteUpdateVenue[]
  skipped: LiteSkippedVenue[]
  errors: LiteErrorEntry[]
}

export interface LiteVenueLoadOptions {
  input_files: string[]
  output_dir: string
  apply: boolean
  existing_snapshot_path?: string
  supabase_url?: string
  supabase_service_role_key?: string
  supabase_client?: ReturnType<typeof createServiceClient>
}

function createServiceClient(url: string, key: string) {
  return createClient(url, key, {
    auth: { persistSession: false },
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeSourceIds(sourceIds: SourceId[] | null | undefined): SourceId[] {
  return Array.from(new Set(sourceIds ?? []))
}

function mergeSourceIds(...sourceIdGroups: Array<SourceId[] | null | undefined>): SourceId[] {
  return Array.from(new Set(sourceIdGroups.flatMap((sourceIds) => sourceIds ?? [])))
}

function extractCanonicalVenue(entry: unknown): unknown {
  if (isRecord(entry) && isRecord(entry.venue)) {
    return entry.venue
  }

  return entry
}

async function fetchExistingVenues(
  supabase: ReturnType<typeof createServiceClient>
): Promise<ExistingVenueSnapshot[]> {
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, address_full, address_district, source_ids')

  if (error) {
    if (error.message.includes('column venues.source_ids does not exist')) {
      throw new Error(
        'Failed to fetch existing venues: database schema is missing venues.source_ids. Lite apply requires the source_ids-enabled venues schema for provenance-safe dedupe and updates.'
      )
    }

    throw new Error(`Failed to fetch existing venues: ${error.message}`)
  }

  return (data as unknown as ExistingVenueSnapshot[] | null) ?? []
}

async function readLiteInputFile(inputFile: string): Promise<unknown[]> {
  const content = await readFile(inputFile, 'utf-8')
  const parsed = JSON.parse(content) as unknown

  if (!Array.isArray(parsed)) {
    throw new Error(`Lite input must be an array: ${inputFile}`)
  }

  return parsed.map((entry) => extractCanonicalVenue(entry))
}

function ensureSourceIds(venue: CanonicalVenueRecord): CanonicalVenueRecord {
  return {
    ...venue,
    source_ids: normalizeSourceIds([
      ...(venue.source_ids ?? []),
      ...(venue.source ? [venue.source] : []),
    ]),
  }
}

export async function runLiteVenueLoad(
  options: LiteVenueLoadOptions
): Promise<LiteVenueLoadResult> {
  const timestamp = new Date().toISOString()
  const rawVenues: unknown[] = []

  for (const inputFile of options.input_files) {
    rawVenues.push(...(await readLiteInputFile(inputFile)))
  }

  const skipped: LiteSkippedVenue[] = []
  const errors: LiteErrorEntry[] = []
  const validIncomingByKey = new Map<string, LiteValidVenue>()
  let validCount = 0

  for (const rawVenue of rawVenues) {
    const validation = validateVenueContract(rawVenue)

    if (!validation.ok) {
      const candidate = isRecord(rawVenue) ? rawVenue : null

      skipped.push({
        venue_name: candidate && typeof candidate.name === 'string' ? candidate.name : undefined,
        source_id: candidate && typeof candidate.source_id === 'string' ? candidate.source_id : undefined,
        reason: 'invalid_required_fields',
        errors: validation.errors,
      })
      continue
    }

    validCount += 1
    const normalizedVenue = ensureSourceIds(validation.value)
    const dedupeKey = buildVenueDedupeKey(
      normalizedVenue.name,
      normalizedVenue.address_full,
      normalizedVenue.address_district
    )

    const existingIncoming = validIncomingByKey.get(dedupeKey)
    if (existingIncoming) {
      const mergedSourceIds = mergeSourceIds(existingIncoming.venue.source_ids, normalizedVenue.source_ids)

      validIncomingByKey.set(dedupeKey, {
        dedupe_key: dedupeKey,
        venue: {
          ...existingIncoming.venue,
          source_ids: mergedSourceIds,
        },
      })

      skipped.push({
        dedupe_key: dedupeKey,
        venue_name: normalizedVenue.name,
        source_id: normalizedVenue.source_id,
        reason: 'duplicate_input_dedupe_key',
        details: 'Merged duplicate Lite input into the first valid record for this dedupe key',
      })
      continue
    }

    validIncomingByKey.set(dedupeKey, {
      dedupe_key: dedupeKey,
      venue: normalizedVenue,
    })
  }

  const validRecords = Array.from(validIncomingByKey.values())

  let supabase = options.supabase_client
  let existingVenues: ExistingVenueSnapshot[] = []

  if (options.existing_snapshot_path) {
    const existingSnapshotContent = await readFile(options.existing_snapshot_path, 'utf-8')
    existingVenues = JSON.parse(existingSnapshotContent) as ExistingVenueSnapshot[]
  } else {
    supabase = supabase || (() => {
      const supabaseUrl = options.supabase_url || process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = options.supabase_service_role_key || process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !supabaseKey) {
        throw new Error(
          'Supabase URL and service role key must be provided via env/options, or pass --existing-snapshot for reproducible dry-runs'
        )
      }

      return createServiceClient(supabaseUrl, supabaseKey)
    })()

    existingVenues = await fetchExistingVenues(supabase)
  }

  const existingByKey = new Map<string, ExistingVenueSnapshot>()

  for (const existing of existingVenues) {
    const dedupeKey = buildVenueDedupeKey(existing.name, existing.address_full, existing.address_district)
    existingByKey.set(dedupeKey, existing)
  }

  const toInsert: LiteValidVenue[] = []
  const toUpdate: LiteUpdateVenue[] = []

  for (const validRecord of validRecords) {
    const matched = existingByKey.get(validRecord.dedupe_key)

    if (!matched) {
      toInsert.push(validRecord)
      continue
    }

    const existingSourceIds = normalizeSourceIds(matched.source_ids)
    const incomingSourceIds = normalizeSourceIds(validRecord.venue.source_ids)
    const mergedSourceIds = mergeSourceIds(existingSourceIds, incomingSourceIds)

    if (mergedSourceIds.length > existingSourceIds.length) {
      toUpdate.push({
        dedupe_key: validRecord.dedupe_key,
        venue_name: validRecord.venue.name,
        existing_id: matched.id,
        existing_source_ids: existingSourceIds,
        incoming_source_ids: incomingSourceIds,
        merged_source_ids: mergedSourceIds,
      })
      continue
    }

    skipped.push({
      dedupe_key: validRecord.dedupe_key,
      venue_name: validRecord.venue.name,
      source_id: validRecord.venue.source_id,
      reason: 'already_present',
      details: 'Existing venue already matches and no new source provenance was added',
    })
  }

  const summary: LiteVenueLoadSummary = {
    timestamp,
    input_files: options.input_files,
    total_seen: rawVenues.length,
    valid: validRecords.length,
    inserted: toInsert.length,
    updated: toUpdate.length,
    skipped: skipped.length,
    errors: errors.length,
    apply_ran: false,
  }

  if (options.apply && (toInsert.length > 0 || toUpdate.length > 0)) {
    if (!supabase) {
      throw new Error('Apply mode requires a live Supabase client; existing snapshots are dry-run only')
    }

    for (const item of toInsert) {
      try {
        const { error: insertError } = await supabase.from('venues').insert({
          name: item.venue.name,
          location: `POINT(${item.venue.lng} ${item.venue.lat})`,
          address_full: item.venue.address_full,
          address_district: item.venue.address_district,
          phone: item.venue.phone ?? null,
          operating_hours: item.venue.operating_hours ?? {},
          amenities: item.venue.amenities ?? [],
          total_seats: item.venue.total_seats ?? null,
          parking_available: item.venue.parking_available ?? false,
          source_ids: item.venue.source_ids && item.venue.source_ids.length > 0 ? item.venue.source_ids : null,
        })

        if (insertError) {
          errors.push({
            dedupe_key: item.dedupe_key,
            venue_name: item.venue.name,
            source_id: item.venue.source_id,
            reason: 'insert_failed',
            error: insertError.message,
          })
        }
      } catch (error) {
        errors.push({
          dedupe_key: item.dedupe_key,
          venue_name: item.venue.name,
          source_id: item.venue.source_id,
          reason: 'insert_exception',
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    for (const item of toUpdate) {
      try {
        const { error: updateError } = await supabase
          .from('venues')
          .update({ source_ids: item.merged_source_ids })
          .eq('id', item.existing_id)

        if (updateError) {
          errors.push({
            dedupe_key: item.dedupe_key,
            venue_name: item.venue_name,
            reason: 'source_update_failed',
            error: updateError.message,
          })
        }
      } catch (error) {
        errors.push({
          dedupe_key: item.dedupe_key,
          venue_name: item.venue_name,
          reason: 'source_update_exception',
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    summary.errors = errors.length
    summary.apply_ran = true
  }

  await mkdir(options.output_dir, { recursive: true })
  await Promise.all([
    writeFile(join(options.output_dir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n', 'utf-8'),
    writeFile(join(options.output_dir, 'valid.json'), JSON.stringify(validRecords, null, 2) + '\n', 'utf-8'),
    writeFile(join(options.output_dir, 'to-insert.json'), JSON.stringify(toInsert, null, 2) + '\n', 'utf-8'),
    writeFile(join(options.output_dir, 'to-update.json'), JSON.stringify(toUpdate, null, 2) + '\n', 'utf-8'),
    writeFile(join(options.output_dir, 'skipped.json'), JSON.stringify(skipped, null, 2) + '\n', 'utf-8'),
    writeFile(join(options.output_dir, 'errors.json'), JSON.stringify(errors, null, 2) + '\n', 'utf-8'),
  ])

  return {
    summary,
    valid_records: validRecords,
    to_insert: toInsert,
    to_update: toUpdate,
    skipped,
    errors,
  }
}
