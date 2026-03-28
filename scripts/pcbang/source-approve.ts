import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { decideSourceApproval } from '@/lib/pcbang/source-approval'
import type { SourceScorecard } from '@/lib/pcbang/source-evaluation'

interface SourceApproveArgs {
  inputPath: string | null
  outputPath: string | null
}

function parseArgs(argv: string[]): SourceApproveArgs {
  const args = argv.filter((arg) => arg !== '--')
  const parsed: SourceApproveArgs = {
    inputPath: null,
    outputPath: null,
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

    if (token === '--input') {
      parsed.inputPath = value
      i++
      continue
    }

    if (token === '--output') {
      parsed.outputPath = value
      i++
      continue
    }
  }

  return parsed
}

async function readScorecard(path: string): Promise<SourceScorecard> {
  const raw = await readFile(path, 'utf-8')
  const parsed = JSON.parse(raw) as Partial<SourceScorecard>

  if (parsed.task !== 'task-2-source-scorecard') {
    throw new Error('input must be a task-2 source scorecard artifact')
  }

  if (!Array.isArray(parsed.candidates)) {
    throw new Error('scorecard candidates must be an array')
  }

  return parsed as SourceScorecard
}

async function writeJsonFile(path: string, payload: unknown) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(payload, null, 2) + '\n', 'utf-8')
}

async function main() {
  const parsedArgs = parseArgs(process.argv.slice(2))
  if (!parsedArgs.inputPath) {
    throw new Error('--input is required')
  }

  if (!parsedArgs.outputPath) {
    throw new Error('--output is required')
  }

  const scorecard = await readScorecard(parsedArgs.inputPath)
  const decision = decideSourceApproval(scorecard)
  await writeJsonFile(parsedArgs.outputPath, decision)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})
