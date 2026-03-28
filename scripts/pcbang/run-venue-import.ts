#!/usr/bin/env bun

import { join } from 'node:path'
import { runVenueImport } from '@/lib/pcbang/pipeline/run-venue-import'

const USAGE = `
Usage: bun run crawl:import-venues -- --input <insertable.json> [--input <insertable.json> ...] [--output-dir <dir>] [--apply]

Required flags:
  --input         Path to insertable.json file(s) (can be specified multiple times)

Optional flags:
  --output-dir    Output directory for reports (default: .sisyphus/evidence/pcbang/venue-import/<timestamp>)
  --apply         Apply inserts to live database (default: dry-run only)

Example:
  bun run crawl:import-venues -- --input .sisyphus/evidence/pcbang/load-policy/geto/verify-geto-v2/insertable.json
  bun run crawl:import-venues -- --input geto.json --input pica.json --apply
`

interface CliArgs {
  input_files: string[]
  output_dir: string
  apply: boolean
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.filter((arg) => arg !== '--')

  const inputFiles: string[] = []
  let outputDir: string | null = null
  let apply = false

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
      i++
      continue
    }

    if (token === '--output-dir') {
      outputDir = value
      i++
      continue
    }

    throw new Error(`unknown flag: ${token}`)
  }

  if (inputFiles.length === 0) {
    throw new Error('at least one --input file must be specified')
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const finalOutputDir =
    outputDir ||
    join(process.cwd(), '.sisyphus', 'evidence', 'pcbang', 'venue-import', timestamp)

  return {
    input_files: inputFiles,
    output_dir: finalOutputDir,
    apply
  }
}

async function main() {
  if (process.argv.slice(2).includes('--help')) {
    console.log(USAGE)
    process.exit(0)
  }

  const parsed = parseArgs(process.argv.slice(2))

  console.log('Starting venue import...')
  console.log(`  Input files: ${parsed.input_files.length}`)
  for (const file of parsed.input_files) {
    console.log(`    - ${file}`)
  }
  console.log(`  Output dir: ${parsed.output_dir}`)
  console.log(`  Mode: ${parsed.apply ? 'APPLY' : 'DRY-RUN'}`)
  console.log()

  const result = await runVenueImport(parsed)

  console.log('✓ Venue import completed')
  console.log(`  Output: ${parsed.output_dir}`)
  console.log()
  console.log('Summary:')
  console.log(`  Input venue count: ${result.summary.input_venue_count}`)
  console.log(`  Deduped insert count: ${result.summary.deduped_insert_count}`)
  console.log(`  Already present: ${result.summary.already_present_count}`)
  console.log(`  Errors: ${result.summary.error_count}`)
  console.log(`  Apply ran: ${result.summary.apply_ran}`)

  if (result.summary.error_count > 0) {
    console.log()
    console.log('Errors occurred during import. Check errors.json for details.')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('✗ Venue import failed')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
