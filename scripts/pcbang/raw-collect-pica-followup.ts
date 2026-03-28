#!/usr/bin/env bun

import { join } from 'node:path'
import { runPicaFollowup } from '@/lib/pcbang/raw/pica-followup'

const USAGE = `
Usage: bun run crawl:pica-followup -- --from-run <raw_run_id> [--limit <n>] [--seoul-only] [--timeout-ms <ms>] [--input-dir <path>] [--run-id <id>]

Required flags:
  --from-run     Existing Pica raw run ID to read list data from

Optional flags:
  --limit        Limit number of venues to collect
  --seoul-only   Filter to only Seoul venues
  --timeout-ms   Request timeout in milliseconds (default: 30000)
  --input-dir    Raw bundle base dir (default: .sisyphus/evidence/pcbang/raw)
  --run-id       Override generated follow-up run id

Example:
  bun run crawl:pica-followup -- --from-run verify-pica-v2 --limit 5 --seoul-only
`

interface CliArgs {
  from_run_id: string | null
  raw_base_dir: string
  run_id?: string
  limit?: number
  seoul_only: boolean
  timeout_ms: number
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.filter((arg) => arg !== '--')

  const parsed: CliArgs = {
    from_run_id: null,
    raw_base_dir: join(process.cwd(), '.sisyphus', 'evidence', 'pcbang', 'raw'),
    seoul_only: false,
    timeout_ms: 30000,
  }

  for (let i = 0; i < args.length; i++) {
    const token = args[i]

    if (!token.startsWith('--')) {
      throw new Error(`unknown positional argument: ${token}`)
    }

    if (token === '--seoul-only') {
      parsed.seoul_only = true
      continue
    }

    const value = args[i + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`missing value for ${token}`)
    }

    if (token === '--from-run') {
      parsed.from_run_id = value
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

    if (token === '--timeout-ms') {
      const timeout = Number.parseInt(value, 10)
      if (!Number.isInteger(timeout) || timeout <= 0) {
        throw new Error('--timeout-ms must be a positive integer')
      }

      parsed.timeout_ms = timeout
      i++
      continue
    }

    if (token === '--input-dir') {
      parsed.raw_base_dir = value
      i++
      continue
    }

    if (token === '--run-id') {
      parsed.run_id = value
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

  if (!parsed.from_run_id) {
    console.error(USAGE)
    process.exit(1)
  }

  console.log('Starting Pica follow-up collection...')
  console.log(`  From run: ${parsed.from_run_id}`)
  console.log(`  Seoul only: ${parsed.seoul_only}`)
  console.log(`  Limit: ${parsed.limit ?? 'none'}`)
  console.log(`  Timeout: ${parsed.timeout_ms}ms`)
  if (parsed.run_id) {
    console.log(`  Run ID override: ${parsed.run_id}`)
  }
  console.log()

  const result = await runPicaFollowup({
    from_run_id: parsed.from_run_id,
    raw_base_dir: parsed.raw_base_dir,
    run_id: parsed.run_id,
    limit: parsed.limit,
    seoul_only: parsed.seoul_only,
    timeout_ms: parsed.timeout_ms,
  })

  console.log('✓ Pica follow-up collection completed')
  console.log(`  Run ID: ${result.run_id}`)
  console.log(`  Success: ${result.success_count}`)
  console.log(`  Failure: ${result.failure_count}`)
  console.log(`  Manifest: ${result.manifest_path}`)

  if (result.had_errors) {
    console.warn('\n⚠ Some captures failed. Check the manifest for details.')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('✗ Pica follow-up collection failed')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
