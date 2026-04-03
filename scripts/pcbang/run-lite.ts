#!/usr/bin/env bun

import { runLiteCrawl } from '@/lib/pcbang/pipeline/run-lite-crawl'
import type { SourceId } from '@/lib/pcbang/raw/dto'

const USAGE = `
Usage: bun run crawl:lite-run -- --source <geto|pica> [options]

Required flags:
  --source            Source identifier (geto or pica)

Optional flags (both sources):
  --run-id            Override generated operation ID
  --apply             Apply inserts/updates to live database (default: dry-run only)
  --output-root       Output evidence root directory (default: .sisyphus/evidence/pcbang)
  --timeout-ms        HTTP request timeout in milliseconds (default: 30000)
  --existing-snapshot Path to a JSON snapshot of existing venues for dedupe during Lite load

Optional flags (pica only):
  --limit             Limit number of venues
  --seoul-only        Filter to only Seoul venues
  --pica-max-pages    Maximum list pages to fetch (default: 20)

Optional flags (geto only):
  --geto-district-limit          Maximum districts to fetch (default: 5)
  --geto-max-pages-per-district  Maximum pages per district (default: 2)
  --geto-max-list-pages          Maximum total list pages (default: 10)
  --geto-max-details             Maximum detail pages to fetch (no default limit)

Examples:
  bun run crawl:lite-run -- --source pica --seoul-only --limit 10
  bun run crawl:lite-run -- --source geto --geto-max-details 20
  bun run crawl:lite-run -- --source pica --seoul-only --limit 10 --apply
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
  pica_max_pages?: number
  geto_district_limit?: number
  geto_max_pages_per_district?: number
  geto_max_list_pages?: number
  geto_max_details?: number
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
      i += 1
      continue
    }

    if (token === '--run-id') {
      parsed.operation_id = value
      i += 1
      continue
    }

    if (token === '--output-root') {
      parsed.output_root = value
      i += 1
      continue
    }

    if (token === '--timeout-ms') {
      const timeout = Number.parseInt(value, 10)
      if (!Number.isInteger(timeout) || timeout <= 0) {
        throw new Error('--timeout-ms must be a positive integer')
      }
      parsed.timeout_ms = timeout
      i += 1
      continue
    }

    if (token === '--existing-snapshot') {
      parsed.existing_snapshot_path = value
      i += 1
      continue
    }

    if (token === '--limit') {
      const limit = Number.parseInt(value, 10)
      if (!Number.isInteger(limit) || limit <= 0) {
        throw new Error('--limit must be a positive integer')
      }
      parsed.limit = limit
      i += 1
      continue
    }

    if (token === '--pica-max-pages') {
      const pages = Number.parseInt(value, 10)
      if (!Number.isInteger(pages) || pages <= 0) {
        throw new Error('--pica-max-pages must be a positive integer')
      }
      parsed.pica_max_pages = pages
      i += 1
      continue
    }

    if (token === '--geto-district-limit') {
      const limit = Number.parseInt(value, 10)
      if (!Number.isInteger(limit) || limit <= 0) {
        throw new Error('--geto-district-limit must be a positive integer')
      }
      parsed.geto_district_limit = limit
      i += 1
      continue
    }

    if (token === '--geto-max-pages-per-district') {
      const pages = Number.parseInt(value, 10)
      if (!Number.isInteger(pages) || pages <= 0) {
        throw new Error('--geto-max-pages-per-district must be a positive integer')
      }
      parsed.geto_max_pages_per_district = pages
      i += 1
      continue
    }

    if (token === '--geto-max-list-pages') {
      const pages = Number.parseInt(value, 10)
      if (!Number.isInteger(pages) || pages <= 0) {
        throw new Error('--geto-max-list-pages must be a positive integer')
      }
      parsed.geto_max_list_pages = pages
      i += 1
      continue
    }

    if (token === '--geto-max-details') {
      const details = Number.parseInt(value, 10)
      if (!Number.isInteger(details) || details <= 0) {
        throw new Error('--geto-max-details must be a positive integer')
      }
      parsed.geto_max_details = details
      i += 1
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

  console.log('Starting Lite crawl pipeline...')
  console.log(`  Source: ${parsed.source}`)
  console.log(`  Mode: ${parsed.apply ? 'APPLY' : 'DRY-RUN'}`)
  if (parsed.operation_id) {
    console.log(`  Operation ID: ${parsed.operation_id}`)
  }
  if (parsed.output_root) {
    console.log(`  Output root: ${parsed.output_root}`)
  }
  if (parsed.existing_snapshot_path) {
    console.log(`  Existing snapshot: ${parsed.existing_snapshot_path}`)
  }
  console.log()

  const result = await runLiteCrawl({
    source: parsed.source,
    operation_id: parsed.operation_id,
    output_root: parsed.output_root,
    timeout_ms: parsed.timeout_ms,
    existing_snapshot_path: parsed.existing_snapshot_path,
    limit: parsed.limit,
    seoul_only: parsed.seoul_only,
    apply: parsed.apply,
    pica_max_pages: parsed.pica_max_pages,
    geto_district_limit: parsed.geto_district_limit,
    geto_max_pages_per_district: parsed.geto_max_pages_per_district,
    geto_max_list_pages: parsed.geto_max_list_pages,
    geto_max_details: parsed.geto_max_details,
  })

  console.log('✓ Lite crawl pipeline completed')
  console.log()
  console.log('Summary:')
  console.log(`  Operation ID: ${result.operation_id}`)
  console.log(`  Total seen: ${result.counts.total_seen}`)
  console.log(`  Valid: ${result.counts.valid}`)
  console.log(`  Inserted: ${result.counts.inserted}`)
  console.log(`  Updated: ${result.counts.updated}`)
  console.log(`  Skipped: ${result.counts.skipped}`)
  console.log(`  Errors: ${result.counts.errors}`)
  console.log(`  Apply ran: ${result.apply_ran}`)
  console.log(`  Canonical: ${result.artifact_paths.canonical}`)
  console.log(`  Lite load summary: ${result.artifact_paths.lite_load_summary}`)

  if (result.counts.errors > 0) {
    console.log()
    console.log('Errors occurred during Lite Mode. Check the Lite load errors.json for details.')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('✗ Lite crawl pipeline failed')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
