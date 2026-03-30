import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { SourceId } from '@/lib/pcbang/raw/dto'
import { runCollector, type CollectorResult } from '@/lib/pcbang/raw/collector'
import { runPicaFollowup } from '@/lib/pcbang/raw/pica-followup'
import { runGetoFollowup } from '@/lib/pcbang/raw/geto-followup'
import { buildSeoulDistrictListTarget, buildGetoSeedTargets, fetchSeoulDistricts } from '@/lib/pcbang/raw/geto-seed'
import { runParserPipeline } from '@/lib/pcbang/pipeline/run-parser'
import { runLoadPolicyClassifier } from '@/lib/pcbang/pipeline/run-load-policy'
import { runVenueImport } from '@/lib/pcbang/pipeline/run-venue-import'

interface RunCrawlDeps {
  runCollector: typeof runCollector
  runPicaFollowup: typeof runPicaFollowup
  runGetoFollowup: typeof runGetoFollowup
  fetchSeoulDistricts: typeof fetchSeoulDistricts
  runParserPipeline: typeof runParserPipeline
  runLoadPolicyClassifier: typeof runLoadPolicyClassifier
  runVenueImport: typeof runVenueImport
}

const DEFAULT_DEPS: RunCrawlDeps = {
  runCollector,
  runPicaFollowup,
  runGetoFollowup,
  fetchSeoulDistricts,
  runParserPipeline,
  runLoadPolicyClassifier,
  runVenueImport,
}

export interface CrawlRunOptions {
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

export interface CrawlRunSummary {
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
    load_policy: string
    venue_import: string
  }
  artifact_paths: {
    raw_manifest_seed?: string
    raw_manifest_detail?: string
    raw_manifest_primary?: string
    parser_manifest: string
    canonical: string
    diagnostics: string
    load_policy_summary: string
    insertable: string
    venue_import_summary: string
  }
  counts: {
    raw_success: number
    raw_failure: number
    parsed_canonical: number
    insertable_venues: number
    insertable_pricing: number
    already_present: number
    import_errors: number
  }
  apply_ran: boolean
}

function buildStageRunId(operation_id: string, stage: string): string {
  return `${operation_id}-${stage}`
}

function defaultOutputRoot(): string {
  return join(process.cwd(), '.sisyphus', 'evidence', 'pcbang')
}

function defaultOperationId(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

export async function runCrawl(options: CrawlRunOptions): Promise<CrawlRunSummary> {
  return runCrawlWithDeps(options, DEFAULT_DEPS)
}

export async function runCrawlWithDeps(
  options: CrawlRunOptions,
  deps: RunCrawlDeps
): Promise<CrawlRunSummary> {
  const operation_id = options.operation_id ?? defaultOperationId()
  const output_root = options.output_root ?? defaultOutputRoot()
  const timeout_ms = options.timeout_ms ?? 30000
  const apply = options.apply ?? false
  const mode: 'dry-run' | 'apply' = apply ? 'apply' : 'dry-run'

  const started_at = new Date().toISOString()

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

  const raw_base_dir = join(output_root, 'raw')
  const parser_base_dir = join(output_root, 'parser')
  const load_policy_base_dir = join(output_root, 'load-policy')
  const venue_import_base_dir = join(output_root, 'venue-import')
  const run_summary_base_dir = join(output_root, 'run')

  let raw_result: CollectorResult
  let raw_success_count = 0
  let raw_failure_count = 0
  let parser_run_id: string

  if (options.source === 'geto') {
    const seoul_districts = await deps.fetchSeoulDistricts(timeout_ms)
    const geto_primary_targets = [
      buildSeoulDistrictListTarget(),
      ...buildGetoSeedTargets(seoul_districts.districts, {
        district_limit: options.geto_district_limit,
        max_pages_per_district: options.geto_max_pages_per_district,
        max_list_pages: options.geto_max_list_pages,
      }),
    ]

    const geto_raw_run_id = buildStageRunId(operation_id, 'raw')
    const geto_raw_result = await deps.runCollector({
      source: 'geto',
      targets: null,
      custom_targets: geto_primary_targets,
      output_dir: raw_base_dir,
      run_id: geto_raw_run_id,
      timeout_ms,
    })

    const geto_detail_run_id = buildStageRunId(operation_id, 'detail')
    const geto_detail_result = await deps.runGetoFollowup({
      from_run_id: geto_raw_run_id,
      raw_base_dir,
      run_id: geto_detail_run_id,
      timeout_ms,
      max_details: options.geto_max_details,
    })

    raw_success_count = geto_raw_result.success_count + geto_detail_result.success_count
    raw_failure_count = geto_raw_result.failure_count + geto_detail_result.failure_count
    raw_result = geto_detail_result
    parser_run_id = geto_detail_run_id
  } else {
    const pica_seed_run_id = buildStageRunId(operation_id, 'seed')
    const pica_seed_result = await deps.runCollector({
      source: 'pica',
      targets: null,
      output_dir: raw_base_dir,
      run_id: pica_seed_run_id,
      timeout_ms,
      pica_max_pages: options.pica_max_pages,
    })

    const pica_detail_run_id = buildStageRunId(operation_id, 'detail')
    const pica_detail_result = await deps.runPicaFollowup({
      from_run_id: pica_seed_run_id,
      raw_base_dir,
      run_id: pica_detail_run_id,
      limit: options.limit,
      seoul_only: options.seoul_only ?? false,
      timeout_ms,
    })

    raw_success_count = pica_seed_result.success_count + pica_detail_result.success_count
    raw_failure_count = pica_seed_result.failure_count + pica_detail_result.failure_count
    raw_result = pica_detail_result
    parser_run_id = pica_detail_run_id
  }

  const parser_result = await deps.runParserPipeline({
    source_id: options.source,
    raw_run_id: parser_run_id,
    raw_base_dir,
    output_base_dir: parser_base_dir,
  })

  const load_policy_result = await deps.runLoadPolicyClassifier({
    source_id: options.source,
    run_id: parser_run_id,
    parser_base_dir,
    output_base_dir: load_policy_base_dir,
    existing_snapshot_path: options.existing_snapshot_path,
  })

  const insertable_path = join(
    load_policy_base_dir,
    options.source,
    parser_run_id,
    'insertable.json'
  )

  const venue_import_dir = join(venue_import_base_dir, options.source, operation_id)
  const venue_import_result = await deps.runVenueImport({
    input_files: [insertable_path],
    output_dir: venue_import_dir,
    apply,
  })

  const completed_at = new Date().toISOString()

  const summary: CrawlRunSummary = {
    operation_id,
    source: options.source,
    mode,
    started_at,
    completed_at,
    stage_run_ids:
      options.source === 'geto'
        ? {
            raw_primary: buildStageRunId(operation_id, 'raw'),
            raw_detail: buildStageRunId(operation_id, 'detail'),
            parser: parser_run_id,
            load_policy: parser_run_id,
            venue_import: operation_id,
          }
        : {
            raw_seed: buildStageRunId(operation_id, 'seed'),
            raw_detail: buildStageRunId(operation_id, 'detail'),
            parser: parser_run_id,
            load_policy: parser_run_id,
            venue_import: operation_id,
          },
    artifact_paths:
      options.source === 'geto'
        ? {
            raw_manifest_primary: join(
              raw_base_dir,
              'geto',
              buildStageRunId(operation_id, 'raw'),
              'run-manifest.json'
            ),
            raw_manifest_detail: raw_result.manifest_path,
            parser_manifest: parser_result.manifest_path,
            canonical: parser_result.canonical_path,
            diagnostics: parser_result.diagnostics_path,
            load_policy_summary: join(load_policy_base_dir, options.source, parser_run_id, 'summary.json'),
            insertable: insertable_path,
            venue_import_summary: join(venue_import_dir, 'summary.json'),
          }
        : {
            raw_manifest_seed: join(
              raw_base_dir,
              'pica',
              buildStageRunId(operation_id, 'seed'),
              'run-manifest.json'
            ),
            raw_manifest_detail: raw_result.manifest_path,
            parser_manifest: parser_result.manifest_path,
            canonical: parser_result.canonical_path,
            diagnostics: parser_result.diagnostics_path,
            load_policy_summary: join(load_policy_base_dir, options.source, parser_run_id, 'summary.json'),
            insertable: insertable_path,
            venue_import_summary: join(venue_import_dir, 'summary.json'),
          },
    counts: {
      raw_success: raw_success_count,
      raw_failure: raw_failure_count,
      parsed_canonical: load_policy_result.incoming_count,
      insertable_venues: load_policy_result.insertable_venues_count,
      insertable_pricing: load_policy_result.insertable_pricing_count,
      already_present: venue_import_result.summary.already_present_count,
      import_errors: venue_import_result.summary.error_count,
    },
    apply_ran: venue_import_result.summary.apply_ran,
  }

  const summary_dir = join(run_summary_base_dir, options.source, operation_id)
  await mkdir(summary_dir, { recursive: true })
  const summary_path = join(summary_dir, 'summary.json')
  await writeFile(summary_path, JSON.stringify(summary, null, 2) + '\n', 'utf-8')

  return summary
}
