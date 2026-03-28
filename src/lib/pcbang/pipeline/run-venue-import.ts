import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { buildVenueDedupeKey } from '@/lib/pcbang/load-policy'
import type { CanonicalVenueRecord } from '@/lib/pcbang/dto'

interface InsertableVenue {
  dedupe_key: string
  venue: CanonicalVenueRecord
}

interface InsertableArtifact {
  venues: InsertableVenue[]
  pricing: unknown[]
}

interface ExistingVenueSnapshot {
  id: string
  name: string
  address_full: string
  address_district: string
}

interface VenueToInsert {
  dedupe_key: string
  venue: CanonicalVenueRecord
}

interface AlreadyPresentVenue {
  dedupe_key: string
  venue_name: string
  existing_id: string
}

interface ErrorEntry {
  dedupe_key?: string
  venue_name?: string
  reason: string
  error: string
}

export interface VenueImportSummary {
  timestamp: string
  input_files: string[]
  input_venue_count: number
  duplicate_input_count: number
  deduped_insert_count: number
  already_present_count: number
  error_count: number
  apply_ran: boolean
}

export interface VenueImportResult {
  summary: VenueImportSummary
  to_insert: VenueToInsert[]
  already_present: AlreadyPresentVenue[]
  errors: ErrorEntry[]
}

export interface VenueImportOptions {
  input_files: string[]
  output_dir: string
  apply: boolean
  supabase_url?: string
  supabase_service_role_key?: string
  supabase_client?: ReturnType<typeof createServiceClient>
}

function createServiceClient(url: string, key: string) {
  return createClient<Database>(url, key, {
    auth: { persistSession: false }
  })
}

async function fetchExistingVenues(
  supabase: ReturnType<typeof createServiceClient>
): Promise<ExistingVenueSnapshot[]> {
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, address_full, address_district')

  if (error) {
    throw new Error(`Failed to fetch existing venues: ${error.message}`)
  }

  return data || []
}

export async function runVenueImport(
  options: VenueImportOptions
): Promise<VenueImportResult> {
  const timestamp = new Date().toISOString()

  // Read all input files
  const allVenues: InsertableVenue[] = []
  for (const inputFile of options.input_files) {
    const content = await readFile(inputFile, 'utf-8')
    const artifact = JSON.parse(content) as InsertableArtifact
    allVenues.push(...artifact.venues)
  }

  const dedupedIncomingByKey = new Map<string, InsertableVenue>()
  const duplicateInputErrors: ErrorEntry[] = []
  for (const incoming of allVenues) {
    const existingIncoming = dedupedIncomingByKey.get(incoming.dedupe_key)
    if (existingIncoming) {
      duplicateInputErrors.push({
        dedupe_key: incoming.dedupe_key,
        venue_name: incoming.venue.name,
        reason: 'duplicate_input_dedupe_key',
        error: `Duplicate input venue for dedupe key already provided by '${existingIncoming.venue.name}'`,
      })
      continue
    }

    dedupedIncomingByKey.set(incoming.dedupe_key, incoming)
  }

  const dedupedIncomingVenues = Array.from(dedupedIncomingByKey.values())

  // Fetch existing venues from Supabase
  const supabase = options.supabase_client || (() => {
    const supabaseUrl = options.supabase_url || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = options.supabase_service_role_key || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and service role key must be provided via env or options')
    }

    return createServiceClient(supabaseUrl, supabaseKey)
  })()
  
  const existingVenues = await fetchExistingVenues(supabase)

  // Build dedupe map
  const existingByKey = new Map<string, ExistingVenueSnapshot>()
  for (const existing of existingVenues) {
    const key = buildVenueDedupeKey(
      existing.name,
      existing.address_full,
      existing.address_district
    )
    existingByKey.set(key, existing)
  }

  // Dedupe incoming venues
  const toInsert: VenueToInsert[] = []
  const alreadyPresent: AlreadyPresentVenue[] = []
  const errors: ErrorEntry[] = [...duplicateInputErrors]

  for (const incoming of dedupedIncomingVenues) {
    const matched = existingByKey.get(incoming.dedupe_key)
    if (matched) {
      alreadyPresent.push({
        dedupe_key: incoming.dedupe_key,
        venue_name: incoming.venue.name,
        existing_id: matched.id
      })
    } else {
      toInsert.push({
        dedupe_key: incoming.dedupe_key,
        venue: incoming.venue
      })
    }
  }

  const summary: VenueImportSummary = {
    timestamp,
    input_files: options.input_files,
    input_venue_count: allVenues.length,
    duplicate_input_count: duplicateInputErrors.length,
    deduped_insert_count: toInsert.length,
    already_present_count: alreadyPresent.length,
    error_count: errors.length,
    apply_ran: false
  }

  // Apply if requested
  if (options.apply && toInsert.length > 0) {
    for (const item of toInsert) {
      try {
        const { error: insertError } = await supabase.from('venues').insert({
          name: item.venue.name,
          location: `POINT(${item.venue.lng} ${item.venue.lat})`,
          address_full: item.venue.address_full,
          address_district: item.venue.address_district,
          phone: item.venue.phone || null,
          operating_hours: item.venue.operating_hours || {},
          amenities: item.venue.amenities || [],
          total_seats: item.venue.total_seats || null,
          parking_available: item.venue.parking_available || false
        })

        if (insertError) {
          errors.push({
            dedupe_key: item.dedupe_key,
            venue_name: item.venue.name,
            reason: 'insert_failed',
            error: insertError.message
          })
        }
      } catch (err) {
        errors.push({
          dedupe_key: item.dedupe_key,
          venue_name: item.venue.name,
          reason: 'insert_exception',
          error: err instanceof Error ? err.message : String(err)
        })
      }
    }

    summary.error_count = errors.length
    summary.apply_ran = true
  }

  // Write output artifacts
  await mkdir(options.output_dir, { recursive: true })

  await Promise.all([
    writeFile(
      join(options.output_dir, 'summary.json'),
      JSON.stringify(summary, null, 2) + '\n',
      'utf-8'
    ),
    writeFile(
      join(options.output_dir, 'to-insert.json'),
      JSON.stringify(toInsert, null, 2) + '\n',
      'utf-8'
    ),
    writeFile(
      join(options.output_dir, 'already-present.json'),
      JSON.stringify(alreadyPresent, null, 2) + '\n',
      'utf-8'
    ),
    writeFile(
      join(options.output_dir, 'errors.json'),
      JSON.stringify(errors, null, 2) + '\n',
      'utf-8'
    )
  ])

  return {
    summary,
    to_insert: toInsert,
    already_present: alreadyPresent,
    errors
  }
}
