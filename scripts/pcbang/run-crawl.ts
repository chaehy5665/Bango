#!/usr/bin/env bun

import { runCrawl } from '@/lib/pcbang/pipeline/run-crawl'
import type { SourceId } from '@/lib/pcbang/raw/dto'

const USAGE = `
Usage: bun run crawl:run -- --source <geto|pica> [options]

Required flags:
  --source            Source identifier (geto or pica)

Optional flags:
  --run-id            Override generated operation ID
  --apply             Apply inserts to live database (default: dry-run only)
  --output-root       Output evidence root directory (default: .sisyphus/evidence/pcbang)
  --timeout-ms        HTTP request timeout in milliseconds (default: 30000)
  --existing-snapshot Path to existing venue snapshot JSON for load-policy classification
  --limit             Limit number of venues (pica only)
  --seoul-only        Filter to only Seoul venues (pica only)

Examples:
  # GetO dry-run (default)
  bun run crawl:run -- --source geto

  # GetO with apply and custom run ID
  bun run crawl:run -- --source geto --run-id prod-geto-2026-03-28 --apply

  # Pica dry-run with Seoul filter and limit
  bun run crawl:run -- --source pica --seoul-only --limit 10

  # Pica with existing snapshot and apply
  bun run crawl:run -- --source pica --existing-snapshot snapshot.json --apply
`

interface CliArgs {
  source: SourceId | null
  operation_id?: string
  apply: boolean
  output_root?: string
  timeout_ms?: number
  existing_snapshot_path?: string
  limit?: number
  seoul_only?: boolean
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.filter((arg) => arg !== '--')

  const parsed: CliArgs = {
    source: null,
    apply: false,
  }

  for (let i = 0; i < args.length; i++) {
    const token = args[i]

    if (!token.startsWith('--')) {
      throw new Error(`unknown positional argument: ${token}`)
    }

    if (token === '--apply') {
      parsed.apply = true
      continue
    }

    if (token === '--seoul-only') {
      parsed.seoul_only = true
      continue
    }

    const value = args[i + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`missing value for ${token}`)
    }

    if (token === '--source') {
      if (value !== 'geto' && value !== 'pica') {
        throw new Error('--source must be geto or pica')
      }
      parsed.source = value
      i++
      continue
    }

    if (token === '--run-id') {
      parsed.operation_id = value
      i++
      continue
    }

    if (token === '--output-root') {
      parsed.output_root = value
      i++
      continue
    }

    if (token === '--timeout-ms') {
      const timeout = Number.parseInt(value, 10)
      if (!Number.isInteger(timeout) || timeout <= 0) {
        throw new Error('--timeout-ms must be a positive integer')
      }
      parsed.timeout_ms = timeout
      i++
      continue
    }

    if (token === '--existing-snapshot') {
      parsed.existing_snapshot_path = value
      i++
      continue
    }

    if (token === '--limit') {
      const limit = Number.parseInt(value, 10)
      if (!Number.isInteger(limit) || limit <= 0) {
        throw new Error('--limit must be a positive integer')
      }
      parsed.limit = limit
      i++
      continue
    }

    throw new Error(`unknown flag: ${token}`)
  }

  return parsed
}

async function main() {
  if (process.argv.slice(2).includes('--help')) {
    console.log(USAGE)
    process.exit(0)
  }

  const parsed = parseArgs(process.argv.slice(2))

  if (!parsed.source) {
    console.error(USAGE)
    process.exit(1)
  }

  console.log('Starting crawl orchestration...')
  console.log(`  Source: ${parsed.source}`)
  console.log(`  Mode: ${parsed.apply ? 'APPLY' : 'DRY-RUN'}`)
  if (parsed.operation_id) {
    console.log(`  Operation ID: ${parsed.operation_id}`)
  }
  if (parsed.output_root) {
    console.log(`  Output root: ${parsed.output_root}`)
  }
  if (parsed.timeout_ms) {
    console.log(`  Timeout: ${parsed.timeout_ms}ms`)
  }
  if (parsed.existing_snapshot_path) {
    console.log(`  Existing snapshot: ${parsed.existing_snapshot_path}`)
  }
  if (parsed.source === 'pica') {
    if (parsed.limit) {
      console.log(`  Limit: ${parsed.limit}`)
    }
    if (parsed.seoul_only) {
      console.log(`  Seoul only: yes`)
    }
  }
  console.log()

  const result = await runCrawl({
    source: parsed.source,
    operation_id: parsed.operation_id,
    output_root: parsed.output_root,
    timeout_ms: parsed.timeout_ms,
    existing_snapshot_path: parsed.existing_snapshot_path,
    limit: parsed.limit,
    seoul_only: parsed.seoul_only,
    apply: parsed.apply,
  })

  console.log('✓ Crawl orchestration completed')
  console.log()
  console.log('Operation Summary:')
  console.log(`  Operation ID: ${result.operation_id}`)
  console.log(`  Source: ${result.source}`)
  console.log(`  Mode: ${result.mode}`)
  console.log(`  Started: ${result.started_at}`)
  console.log(`  Completed: ${result.completed_at}`)
  console.log()
  console.log('Stage Run IDs:')
  if (result.stage_run_ids.raw_seed) {
    console.log(`  Raw seed: ${result.stage_run_ids.raw_seed}`)
  }
  if (result.stage_run_ids.raw_detail) {
    console.log(`  Raw detail: ${result.stage_run_ids.raw_detail}`)
  }
  if (result.stage_run_ids.raw_primary) {
    console.log(`  Raw primary: ${result.stage_run_ids.raw_primary}`)
  }
  console.log(`  Parser: ${result.stage_run_ids.parser}`)
  console.log(`  Load policy: ${result.stage_run_ids.load_policy}`)
  console.log(`  Venue import: ${result.stage_run_ids.venue_import}`)
  console.log()
  console.log('Counts:')
  console.log(`  Raw success: ${result.counts.raw_success}`)
  console.log(`  Raw failure: ${result.counts.raw_failure}`)
  console.log(`  Parsed canonical: ${result.counts.parsed_canonical}`)
  console.log(`  Insertable venues: ${result.counts.insertable_venues}`)
  console.log(`  Insertable pricing tiers: ${result.counts.insertable_pricing}`)
  console.log(`  Already present: ${result.counts.already_present}`)
  console.log(`  Import errors: ${result.counts.import_errors}`)
  console.log()
  console.log('Artifact Paths:')
  if (result.artifact_paths.raw_manifest_seed) {
    console.log(`  Raw seed manifest: ${result.artifact_paths.raw_manifest_seed}`)
  }
  if (result.artifact_paths.raw_manifest_detail) {
    console.log(`  Raw detail manifest: ${result.artifact_paths.raw_manifest_detail}`)
  }
  if (result.artifact_paths.raw_manifest_primary) {
    console.log(`  Raw manifest: ${result.artifact_paths.raw_manifest_primary}`)
  }
  console.log(`  Parser manifest: ${result.artifact_paths.parser_manifest}`)
  console.log(`  Canonical venues: ${result.artifact_paths.canonical}`)
  console.log(`  Diagnostics: ${result.artifact_paths.diagnostics}`)
  console.log(`  Load policy summary: ${result.artifact_paths.load_policy_summary}`)
  console.log(`  Insertable venues: ${result.artifact_paths.insertable}`)
  console.log(`  Venue import summary: ${result.artifact_paths.venue_import_summary}`)
  console.log()
  console.log(`Apply ran: ${result.apply_ran}`)

  if (result.counts.import_errors > 0) {
    console.log()
    console.log('⚠ Errors occurred during import. Check venue-import/errors.json for details.')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('✗ Crawl orchestration failed')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
