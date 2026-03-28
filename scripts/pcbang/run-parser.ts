import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { runParserPipeline } from '@/lib/pcbang/pipeline/run-parser'
import type { SourceId } from '@/lib/pcbang/raw/dto'

const USAGE = `
Usage: bun run crawl:parse-raw -- --source <source_id> --run-id <raw_run_id> [--input-dir <path>] [--output-dir <path>]

Required flags:
  --source      Source identifier (geto | pica)
  --run-id      Run ID from raw collector

Optional flags:
  --input-dir   Raw bundle base dir (default: .sisyphus/evidence/pcbang/raw)
  --output-dir  Parser output base dir (default: .sisyphus/evidence/pcbang/parser)

Example:
  bun run crawl:parse-raw -- --source geto --run-id verify-geto-v2
  bun run crawl:parse-raw -- --source pica --run-id verify-pica-v2
`

interface CliArgs {
  source_id: SourceId | null
  raw_run_id: string | null
  raw_base_dir: string
  output_base_dir: string
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.filter((arg) => arg !== '--')

  const parsed: CliArgs = {
    source_id: null,
    raw_run_id: null,
    raw_base_dir: join(process.cwd(), '.sisyphus', 'evidence', 'pcbang', 'raw'),
    output_base_dir: join(process.cwd(), '.sisyphus', 'evidence', 'pcbang', 'parser'),
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
        throw new Error(`Invalid source_id: ${value}`)
      }

      parsed.source_id = value
      i++
      continue
    }

    if (token === '--run-id') {
      parsed.raw_run_id = value
      i++
      continue
    }

    if (token === '--input-dir') {
      parsed.raw_base_dir = value
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
  const parsed = parseArgs(process.argv.slice(2))

  if (!parsed.source_id || !parsed.raw_run_id) {
    console.error(USAGE)
    process.exit(1)
  }

  console.log(`Starting parser pipeline for ${parsed.source_id}/${parsed.raw_run_id}...`)

  try {
    const result = await runParserPipeline({
      source_id: parsed.source_id,
      raw_run_id: parsed.raw_run_id,
      raw_base_dir: parsed.raw_base_dir,
      output_base_dir: parsed.output_base_dir,
    })

    console.log('\nParser pipeline completed successfully:')
    console.log(`  Output directory: ${result.output_dir}`)
    console.log(`  Manifest:         ${result.manifest_path}`)
    console.log(`  Canonical:        ${result.canonical_path}`)
    console.log(`  Diagnostics:      ${result.diagnostics_path}`)

    const manifest = JSON.parse(await readFile(result.manifest_path, 'utf-8')) as {
      parsed_targets: string[]
      success_count: number
      diagnostic_counts: {
        info: number
        warning: number
        error: number
      }
    }
    console.log('\nSummary:')
    console.log(`  Parsed targets:   ${manifest.parsed_targets.join(', ')}`)
    console.log(`  Valid canonical:  ${manifest.success_count}`)
    console.log(`  Info:             ${manifest.diagnostic_counts.info}`)
    console.log(`  Warnings:         ${manifest.diagnostic_counts.warning}`)
    console.log(`  Errors:           ${manifest.diagnostic_counts.error}`)
  } catch (error) {
    console.error('\nParser pipeline failed:')
    console.error(error)
    process.exit(1)
  }
}

main()
