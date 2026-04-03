import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { SourceId } from '@/lib/pcbang/raw/dto'
import { runCollector, type CollectorResult } from '@/lib/pcbang/raw/collector'
import { runPicaFollowup } from '@/lib/pcbang/raw/pica-followup'
import { runGetoFollowup } from '@/lib/pcbang/raw/geto-followup'
import { buildSeoulDistrictListTarget, buildGetoSeedTargets, fetchSeoulDistricts } from '@/lib/pcbang/raw/geto-seed'
import { runParserPipeline } from '@/lib/pcbang/pipeline/run-parser'
import { runLiteVenueLoad } from '@/lib/pcbang/pipeline/run-lite-venue-load'

interface RunLiteCrawlDeps {
  runCollector: typeof runCollector
  runPicaFollowup: typeof runPicaFollowup
  runGetoFollowup: typeof runGetoFollowup
  fetchSeoulDistricts: typeof fetchSeoulDistricts
  runParserPipeline: typeof runParserPipeline
  runLiteVenueLoad: typeof runLiteVenueLoad
}

const DEFAULT_DEPS: RunLiteCrawlDeps = {
  runCollector,
  runPicaFollowup,
  runGetoFollowup,
  fetchSeoulDistricts,
  runParserPipeline,
  runLiteVenueLoad,
}

export interface LiteCrawlRunOptions {
  source: SourceId
  operation_id?: string
  output_root?: string
  timeout_ms?: number
  existing_snapshot_path?: string
  limit?: number
  seoul_only?: boolean
  apply?: boolean
  pica_max_pages?: number
  geto_district_limit?: number
  geto_max_pages_per_district?: number
  geto_max_list_pages?: number
  geto_max_details?: number
}

export interface LiteCrawlRunSummary {
  operation_id: string
  source: SourceId
  mode: 'dry-run' | 'apply'
  started_at: string
  completed_at: string
  stage_run_ids: {
    raw_seed?: string
    raw_detail?: string
    raw_primary?: string
    parser: string
    lite_load: string
  }
  artifact_paths: {
    raw_manifest_seed?: string
    raw_manifest_detail: string
    raw_manifest_primary?: string
    parser_manifest: string
    canonical: string
    diagnostics: string
    lite_load_summary: string
  }
  counts: {
    raw_success: number
    raw_failure: number
    total_seen: number
    valid: number
    inserted: number
    updated: number
    skipped: number
    errors: number
  }
  apply_ran: boolean
}

function buildStageRunId(operationId: string, stage: string): string {
  return `${operationId}-${stage}`
}

function defaultOutputRoot(): string {
  return join(process.cwd(), '.sisyphus', 'evidence', 'pcbang')
}

function defaultOperationId(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

export async function runLiteCrawl(options: LiteCrawlRunOptions): Promise<LiteCrawlRunSummary> {
  return runLiteCrawlWithDeps(options, DEFAULT_DEPS)
}

export async function runLiteCrawlWithDeps(
  options: LiteCrawlRunOptions,
  deps: RunLiteCrawlDeps
): Promise<LiteCrawlRunSummary> {
  const operationId = options.operation_id ?? defaultOperationId()
  const outputRoot = options.output_root ?? defaultOutputRoot()
  const timeoutMs = options.timeout_ms ?? 30000
  const apply = options.apply ?? false
  const mode: 'dry-run' | 'apply' = apply ? 'apply' : 'dry-run'
  const startedAt = new Date().toISOString()

  if (options.source === 'geto') {
    if (options.limit !== undefined || options.seoul_only !== undefined || options.pica_max_pages !== undefined) {
      throw new Error('--limit, --seoul-only, and --pica-max-pages are only valid for source=pica')
    }
  } else if (options.source === 'pica') {
    if (
      options.geto_district_limit !== undefined ||
      options.geto_max_pages_per_district !== undefined ||
      options.geto_max_list_pages !== undefined ||
      options.geto_max_details !== undefined
    ) {
      throw new Error(
        '--geto-district-limit, --geto-max-pages-per-district, --geto-max-list-pages, and --geto-max-details are only valid for source=geto'
      )
    }
  }

  const rawBaseDir = join(outputRoot, 'raw')
  const parserBaseDir = join(outputRoot, 'parser')
  const liteLoadBaseDir = join(outputRoot, 'lite-load')
  const liteRunBaseDir = join(outputRoot, 'lite-run')

  let rawResult: CollectorResult
  let rawSuccessCount = 0
  let rawFailureCount = 0
  let parserRunId: string
  let rawPrimaryManifestPath: string | undefined
  let rawSeedManifestPath: string | undefined

  if (options.source === 'geto') {
    const seoulDistricts = await deps.fetchSeoulDistricts(timeoutMs)
    const getoPrimaryTargets = [
      buildSeoulDistrictListTarget(),
      ...buildGetoSeedTargets(seoulDistricts.districts, {
        district_limit: options.geto_district_limit,
        max_pages_per_district: options.geto_max_pages_per_district,
        max_list_pages: options.geto_max_list_pages,
      }),
    ]

    const getoRawRunId = buildStageRunId(operationId, 'raw')
    const getoRawResult = await deps.runCollector({
      source: 'geto',
      targets: null,
      custom_targets: getoPrimaryTargets,
      output_dir: rawBaseDir,
      run_id: getoRawRunId,
      timeout_ms: timeoutMs,
    })

    const getoDetailRunId = buildStageRunId(operationId, 'detail')
    const getoDetailResult = await deps.runGetoFollowup({
      from_run_id: getoRawRunId,
      raw_base_dir: rawBaseDir,
      run_id: getoDetailRunId,
      timeout_ms: timeoutMs,
      max_details: options.geto_max_details,
    })

    rawSuccessCount = getoRawResult.success_count + getoDetailResult.success_count
    rawFailureCount = getoRawResult.failure_count + getoDetailResult.failure_count
    rawResult = getoDetailResult
    parserRunId = getoDetailRunId
    rawPrimaryManifestPath = join(rawBaseDir, 'geto', getoRawRunId, 'run-manifest.json')
  } else {
    const picaSeedRunId = buildStageRunId(operationId, 'seed')
    const picaSeedResult = await deps.runCollector({
      source: 'pica',
      targets: null,
      output_dir: rawBaseDir,
      run_id: picaSeedRunId,
      timeout_ms: timeoutMs,
      pica_max_pages: options.pica_max_pages,
    })

    const picaDetailRunId = buildStageRunId(operationId, 'detail')
    const picaDetailResult = await deps.runPicaFollowup({
      from_run_id: picaSeedRunId,
      raw_base_dir: rawBaseDir,
      run_id: picaDetailRunId,
      limit: options.limit,
      seoul_only: options.seoul_only ?? false,
      timeout_ms: timeoutMs,
    })

    rawSuccessCount = picaSeedResult.success_count + picaDetailResult.success_count
    rawFailureCount = picaSeedResult.failure_count + picaDetailResult.failure_count
    rawResult = picaDetailResult
    parserRunId = picaDetailRunId
    rawSeedManifestPath = join(rawBaseDir, 'pica', picaSeedRunId, 'run-manifest.json')
  }

  const parserResult = await deps.runParserPipeline({
    source_id: options.source,
    raw_run_id: parserRunId,
    raw_base_dir: rawBaseDir,
    output_base_dir: parserBaseDir,
  })

  const liteLoadDir = join(liteLoadBaseDir, options.source, operationId)
  const liteLoadResult = await deps.runLiteVenueLoad({
    input_files: [parserResult.canonical_path],
    output_dir: liteLoadDir,
    apply,
    existing_snapshot_path: options.existing_snapshot_path,
  })

  const completedAt = new Date().toISOString()

  const summary: LiteCrawlRunSummary = {
    operation_id: operationId,
    source: options.source,
    mode,
    started_at: startedAt,
    completed_at: completedAt,
    stage_run_ids:
      options.source === 'geto'
        ? {
            raw_primary: buildStageRunId(operationId, 'raw'),
            raw_detail: buildStageRunId(operationId, 'detail'),
            parser: parserRunId,
            lite_load: operationId,
          }
        : {
            raw_seed: buildStageRunId(operationId, 'seed'),
            raw_detail: buildStageRunId(operationId, 'detail'),
            parser: parserRunId,
            lite_load: operationId,
          },
    artifact_paths: {
      ...(rawSeedManifestPath ? { raw_manifest_seed: rawSeedManifestPath } : {}),
      ...(rawPrimaryManifestPath ? { raw_manifest_primary: rawPrimaryManifestPath } : {}),
      raw_manifest_detail: rawResult.manifest_path,
      parser_manifest: parserResult.manifest_path,
      canonical: parserResult.canonical_path,
      diagnostics: parserResult.diagnostics_path,
      lite_load_summary: join(liteLoadDir, 'summary.json'),
    },
    counts: {
      raw_success: rawSuccessCount,
      raw_failure: rawFailureCount,
      total_seen: liteLoadResult.summary.total_seen,
      valid: liteLoadResult.summary.valid,
      inserted: liteLoadResult.summary.inserted,
      updated: liteLoadResult.summary.updated,
      skipped: liteLoadResult.summary.skipped,
      errors: liteLoadResult.summary.errors,
    },
    apply_ran: liteLoadResult.summary.apply_ran,
  }

  const summaryDir = join(liteRunBaseDir, options.source, operationId)
  await mkdir(summaryDir, { recursive: true })
  await writeFile(join(summaryDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n', 'utf-8')

  return summary
}
