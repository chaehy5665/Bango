import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { CanonicalVenueWithPricing } from '@/lib/pcbang/dto'
import type { ExistingVenueSnapshot } from '@/lib/pcbang/load-policy'
import { classifyLoadPolicy } from '@/lib/pcbang/load-policy'
import type { SourceId } from '@/lib/pcbang/raw/dto'

export interface LoadPolicyRunnerOptions {
  source_id: SourceId
  run_id: string
  parser_base_dir: string
  output_base_dir: string
  existing_snapshot_path?: string
}

export interface LoadPolicySummary {
  source_id: string
  run_id: string
  timestamp: string
  incoming_count: number
  insertable_venues_count: number
  insertable_pricing_count: number
  review_needed_count: number
  skipped_count: number
  errors_count: number
}

export async function runLoadPolicyClassifier(
  options: LoadPolicyRunnerOptions
): Promise<LoadPolicySummary> {
  const canonical_path = join(
    options.parser_base_dir,
    options.source_id,
    options.run_id,
    'canonical.json'
  )

  const canonical_content = await readFile(canonical_path, 'utf-8')
  const incoming = JSON.parse(canonical_content) as CanonicalVenueWithPricing[]

  let existing: ExistingVenueSnapshot[] = []
  if (options.existing_snapshot_path) {
    const existing_content = await readFile(options.existing_snapshot_path, 'utf-8')
    existing = JSON.parse(existing_content) as ExistingVenueSnapshot[]
  }

  const result = classifyLoadPolicy(incoming, existing)

  const output_dir = join(options.output_base_dir, options.source_id, options.run_id)
  await mkdir(output_dir, { recursive: true })

  const timestamp = new Date().toISOString()

  const summary: LoadPolicySummary = {
    source_id: options.source_id,
    run_id: options.run_id,
    timestamp,
    incoming_count: incoming.length,
    insertable_venues_count: result.insertable.venues.length,
    insertable_pricing_count: result.insertable.pricing.length,
    review_needed_count: result.review_needed.length,
    skipped_count: result.skipped.length,
    errors_count: result.errors.length,
  }

  await Promise.all([
    writeFile(join(output_dir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n', 'utf-8'),
    writeFile(
      join(output_dir, 'insertable.json'),
      JSON.stringify(result.insertable, null, 2) + '\n',
      'utf-8'
    ),
    writeFile(
      join(output_dir, 'review-needed.json'),
      JSON.stringify(result.review_needed, null, 2) + '\n',
      'utf-8'
    ),
    writeFile(join(output_dir, 'skipped.json'), JSON.stringify(result.skipped, null, 2) + '\n', 'utf-8'),
    writeFile(join(output_dir, 'errors.json'), JSON.stringify(result.errors, null, 2) + '\n', 'utf-8'),
  ])

  return summary
}
