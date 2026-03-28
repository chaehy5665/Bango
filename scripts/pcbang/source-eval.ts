import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { getSeoulSamplePanel, SEOUL_SAMPLE_SIZE, WAVE1_SOURCE_RUBRIC } from '@/lib/pcbang/source-rubric'
import { buildSourceScorecard, parseCandidateIds } from '@/lib/pcbang/source-evaluation'

interface SourceEvalArgs {
  city: string
  sampleSize: number
  rubricOnly: boolean
  candidates: string | null
  outputPath: string | null
  sampleOutputPath: string | null
}

function parseArgs(argv: string[]): SourceEvalArgs {
  const args = argv.filter((arg) => arg !== '--')

  const result: SourceEvalArgs = {
    city: 'seoul',
    sampleSize: SEOUL_SAMPLE_SIZE,
    rubricOnly: false,
    candidates: null,
    outputPath: null,
    sampleOutputPath: null,
  }

  for (let i = 0; i < args.length; i++) {
    const token = args[i]

    if (!token.startsWith('--')) {
      continue
    }

    if (token === '--rubric-only') {
      result.rubricOnly = true
      continue
    }

    const value = args[i + 1]
    if (!value || value.startsWith('--')) {
      throw new Error(`missing value for ${token}`)
    }

    if (token === '--city') {
      result.city = value.toLowerCase()
      i++
      continue
    }

    if (token === '--sample-size') {
      const parsed = Number.parseInt(value, 10)
      if (!Number.isInteger(parsed)) {
        throw new Error('sample-size must be an integer')
      }

      result.sampleSize = parsed
      i++
      continue
    }

    if (token === '--output') {
      result.outputPath = value
      i++
      continue
    }

    if (token === '--candidates') {
      result.candidates = value
      i++
      continue
    }

    if (token === '--sample-output') {
      result.sampleOutputPath = value
      i++
      continue
    }
  }

  return result
}

async function writeJsonFile(path: string, payload: unknown) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(payload, null, 2) + '\n', 'utf-8')
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2))

  if (parsed.city !== 'seoul') {
    throw new Error('city must be seoul for wave-1')
  }

  if (parsed.sampleSize < SEOUL_SAMPLE_SIZE) {
    throw new Error('sample-size must be >= 20')
  }

  if (!parsed.outputPath) {
    throw new Error('--output is required')
  }

  if (parsed.sampleSize > SEOUL_SAMPLE_SIZE) {
    throw new Error('wave-1 Seoul sample panel supports exactly 20 venues')
  }

  if (parsed.rubricOnly && !parsed.sampleOutputPath) {
    throw new Error('--sample-output is required when --rubric-only is set')
  }

  if (parsed.rubricOnly && parsed.candidates) {
    throw new Error('--rubric-only cannot be combined with --candidates')
  }

  const samplePanel = getSeoulSamplePanel(parsed.sampleSize)

  if (parsed.candidates) {
    const candidateIds = parseCandidateIds(parsed.candidates)
    const scorecard = buildSourceScorecard(candidateIds, WAVE1_SOURCE_RUBRIC)
    await writeJsonFile(parsed.outputPath, scorecard)
    return
  }

  const rubricArtifact = {
    task: 'task-1-source-rubric',
    mode: parsed.rubricOnly ? 'rubric-only' : 'source-eval',
    generated_at: new Date().toISOString(),
    rubric: WAVE1_SOURCE_RUBRIC,
  }

  await writeJsonFile(parsed.outputPath, rubricArtifact)

  if (parsed.rubricOnly && parsed.sampleOutputPath) {
    await writeJsonFile(parsed.sampleOutputPath, {
      city: 'seoul',
      sample_size: samplePanel.length,
      sample_panel: samplePanel,
    })
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})
