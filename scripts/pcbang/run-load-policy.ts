#!/usr/bin/env bun

import { join } from 'node:path'
import type { SourceId } from '@/lib/pcbang/raw/dto'
import { runLoadPolicyClassifier } from '@/lib/pcbang/pipeline/run-load-policy'

const USAGE = `
Usage: bun run crawl:classify-load-policy -- --source <source_id> --run-id <parser_run_id> [--existing-snapshot <file>] [--input-dir <path>] [--output-dir <path>]

Required flags:
  --source            Source ID (geto or pica)
  --run-id            Parser run ID to classify

Optional flags:
  --existing-snapshot Path to existing venue snapshot JSON (default: none)
  --input-dir         Parser output base dir (default: .sisyphus/evidence/pcbang/parser)
  --output-dir        Load-policy output base dir (default: .sisyphus/evidence/pcbang/load-policy)

Example:
  bun run crawl:classify-load-policy -- --source geto --run-id verify-geto-v2
  bun run crawl:classify-load-policy -- --source pica --run-id verify-pica-v2 --existing-snapshot snapshot.json
`

interface CliArgs {
  source_id: SourceId | null
  run_id: string | null
  parser_base_dir: string
  output_base_dir: string
  existing_snapshot_path?: string
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.filter((arg) => arg !== '--')

  const parsed: CliArgs = {
    source_id: null,
    run_id: null,
    parser_base_dir: join(process.cwd(), '.sisyphus', 'evidence', 'pcbang', 'parser'),
    output_base_dir: join(process.cwd(), '.sisyphus', 'evidence', 'pcbang', 'load-policy'),
  }

  for (let i = 0; i < args.length; i++) {
    const token = args[i]

    if (!token.startsWith('--')) {
      throw new Error(`unknown positional argument: ${token}`)
    }

    const value = args[i + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`missing value for ${token}`)
    }

    if (token === '--source') {
      if (value !== 'geto' && value !== 'pica') {
        throw new Error('--source must be geto or pica')
      }

      parsed.source_id = value
      i++
      continue
    }

    if (token === '--run-id') {
      parsed.run_id = value
      i++
      continue
    }

    if (token === '--existing-snapshot') {
      parsed.existing_snapshot_path = value
      i++
      continue
    }

    if (token === '--input-dir') {
      parsed.parser_base_dir = value
      i++
      continue
    }

    if (token === '--output-dir') {
      parsed.output_base_dir = value
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

  if (!parsed.source_id || !parsed.run_id) {
    console.error(USAGE)
    process.exit(1)
  }

  console.log('Starting load-policy classification...')
  console.log(`  Source: ${parsed.source_id}`)
  console.log(`  Run ID: ${parsed.run_id}`)
  console.log(`  Existing snapshot: ${parsed.existing_snapshot_path ?? 'none'}`)
  console.log()

  const summary = await runLoadPolicyClassifier({
    source_id: parsed.source_id,
    run_id: parsed.run_id,
    parser_base_dir: parsed.parser_base_dir,
    output_base_dir: parsed.output_base_dir,
    existing_snapshot_path: parsed.existing_snapshot_path,
  })

  console.log('✓ Load-policy classification completed')
  console.log(`  Output: ${join(parsed.output_base_dir, parsed.source_id, parsed.run_id)}`)
  console.log()
  console.log('Summary:')
  console.log(`  Incoming venues: ${summary.incoming_count}`)
  console.log(`  Insertable venues: ${summary.insertable_venues_count}`)
  console.log(`  Insertable pricing tiers: ${summary.insertable_pricing_count}`)
  console.log(`  Review needed: ${summary.review_needed_count}`)
  console.log(`  Skipped: ${summary.skipped_count}`)
  console.log(`  Errors: ${summary.errors_count}`)
}

main().catch((error) => {
  console.error('✗ Load-policy classification failed')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
