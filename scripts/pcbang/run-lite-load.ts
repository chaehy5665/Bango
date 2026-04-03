#!/usr/bin/env bun

import { join } from 'node:path'
import { runLiteVenueLoad } from '@/lib/pcbang/pipeline/run-lite-venue-load'

const USAGE = `
Usage: bun run crawl:lite-load -- --input <canonical.json> [--input <canonical.json> ...] [--output-dir <dir>] [--apply]

Required flags:
  --input         Path to canonical parser output or JSON array of canonical venue records

Optional flags:
  --output-dir    Output directory for Lite load reports (default: .sisyphus/evidence/pcbang/lite-load/<timestamp>)
  --existing-snapshot Path to a JSON snapshot of existing venues for deterministic dry-runs
  --apply         Apply inserts/updates to live database (default: dry-run only)

Examples:
  bun run crawl:lite-load -- --input .sisyphus/evidence/pcbang/parser/pica/lite-detail/canonical.json --existing-snapshot tests/fixtures/pcbang/lite-existing-snapshot.json
  bun run crawl:lite-load -- --input canonical.json --apply
`

interface CliArgs {
  input_files: string[]
  output_dir: string
  apply: boolean
  existing_snapshot_path?: string
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.filter((arg) => arg !== '--')

  const inputFiles: string[] = []
  let outputDir: string | null = null
  let apply = false
  let existingSnapshotPath: string | undefined

  for (let i = 0; i < args.length; i++) {
    const token = args[i]

    if (!token.startsWith('--')) {
      throw new Error(`unknown positional argument: ${token}`)
    }

    if (token === '--apply') {
      apply = true
      continue
    }

    const value = args[i + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`missing value for ${token}`)
    }

    if (token === '--input') {
      inputFiles.push(value)
      i += 1
      continue
    }

    if (token === '--output-dir') {
      outputDir = value
      i += 1
      continue
    }

    if (token === '--existing-snapshot') {
      existingSnapshotPath = value
      i += 1
      continue
    }

    throw new Error(`unknown flag: ${token}`)
  }

  if (inputFiles.length === 0) {
    throw new Error('at least one --input file must be specified')
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  return {
    input_files: inputFiles,
    output_dir:
      outputDir ||
      join(process.cwd(), '.sisyphus', 'evidence', 'pcbang', 'lite-load', timestamp),
    existing_snapshot_path: existingSnapshotPath,
    apply,
  }
}

async function main() {
  if (process.argv.slice(2).includes('--help')) {
    console.log(USAGE)
    process.exit(0)
  }

  const parsed = parseArgs(process.argv.slice(2))

  console.log('Starting Lite venue load...')
  console.log(`  Input files: ${parsed.input_files.length}`)
  for (const file of parsed.input_files) {
    console.log(`    - ${file}`)
  }
  console.log(`  Output dir: ${parsed.output_dir}`)
  if (parsed.existing_snapshot_path) {
    console.log(`  Existing snapshot: ${parsed.existing_snapshot_path}`)
  }
  console.log(`  Mode: ${parsed.apply ? 'APPLY' : 'DRY-RUN'}`)
  console.log()

  const result = await runLiteVenueLoad(parsed)

  console.log('✓ Lite venue load completed')
  console.log(`  Output: ${parsed.output_dir}`)
  console.log()
  console.log('Summary:')
  console.log(`  Total seen: ${result.summary.total_seen}`)
  console.log(`  Valid: ${result.summary.valid}`)
  console.log(`  Inserted: ${result.summary.inserted}`)
  console.log(`  Updated: ${result.summary.updated}`)
  console.log(`  Skipped: ${result.summary.skipped}`)
  console.log(`  Errors: ${result.summary.errors}`)
  console.log(`  Apply ran: ${result.summary.apply_ran}`)

  if (result.summary.errors > 0) {
    console.log()
    console.log('Errors occurred during Lite load. Check errors.json for details.')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('✗ Lite venue load failed')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
