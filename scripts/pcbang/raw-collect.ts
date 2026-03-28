import type { CollectorConfig, SourceId } from '@/lib/pcbang/raw/dto'
import { runCollector } from '@/lib/pcbang/raw/collector'

interface RawCollectArgs {
  source: SourceId | null
  targets: string[] | null
  output_dir: string
  run_id: string
  timeout_ms: number
}

function parseArgs(argv: string[]): RawCollectArgs {
  const args = argv.filter((arg) => arg !== '--')

  const result: RawCollectArgs = {
    source: null,
    targets: null,
    output_dir: '.sisyphus/evidence/pcbang/raw',
    run_id: new Date().toISOString().replace(/[:.]/g, '-'),
    timeout_ms: 30000,
  }

  for (let i = 0; i < args.length; i++) {
    const token = args[i]

    if (!token.startsWith('--')) {
      continue
    }

    const value = args[i + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`missing value for ${token}`)
    }

    if (token === '--source') {
      if (value !== 'geto' && value !== 'pica') {
        throw new Error('source must be geto or pica')
      }
      result.source = value
      i++
      continue
    }

    if (token === '--targets') {
      result.targets = value.split(',').map((id) => id.trim())
      i++
      continue
    }

    if (token === '--output-dir') {
      result.output_dir = value
      i++
      continue
    }

    if (token === '--run-id') {
      result.run_id = value
      i++
      continue
    }

    if (token === '--timeout-ms') {
      const parsed = Number.parseInt(value, 10)
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error('timeout-ms must be a positive integer')
      }
      result.timeout_ms = parsed
      i++
      continue
    }

    throw new Error(`unknown flag: ${token}`)
  }

  return result
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2))

  if (!parsed.source) {
    throw new Error('--source is required')
  }

  const config: CollectorConfig = {
    source: parsed.source,
    targets: parsed.targets,
    output_dir: parsed.output_dir,
    run_id: parsed.run_id,
    timeout_ms: parsed.timeout_ms,
  }

  console.log(
    `Starting raw collection: source=${config.source}, run_id=${config.run_id}, timeout=${config.timeout_ms}ms`
  )

  if (config.targets) {
    console.log(`Target filter: ${config.targets.join(', ')}`)
  } else {
    console.log('Collecting all preset targets')
  }

  const result = await runCollector(config)

  console.log('\nCollection complete:')
  console.log(`  Started:  ${result.started_at}`)
  console.log(`  Finished: ${result.completed_at}`)
  console.log(`  Success:  ${result.success_count}`)
  console.log(`  Failure:  ${result.failure_count}`)
  console.log(`  Manifest: ${result.manifest_path}`)

  if (result.had_errors) {
    console.error('\nCollection had errors - check run-manifest.json for details')
    process.exit(1)
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Fatal error: ${message}`)
  process.exit(1)
})
