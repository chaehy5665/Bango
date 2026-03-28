import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { SourceId } from '@/lib/pcbang/raw/dto'
import { BundleReader } from '@/lib/pcbang/parser/bundle-reader'
import { parseGetoBundles } from '@/lib/pcbang/parser/geto'
import { parsePicaBundles } from '@/lib/pcbang/parser/pica'
import { mergeRecords, conflictsTodiagnostics } from '@/lib/pcbang/parser/merge-records'
import { normalizeToCanonical } from '@/lib/pcbang/canonical/normalizer'
import type { ParserManifest, ParserDiagnostic, ParserResult } from '@/lib/pcbang/parser/dto'

export interface ParserPipelineConfig {
  source_id: SourceId
  raw_run_id: string
  raw_base_dir: string
  output_base_dir: string
}

export interface ParserPipelineOutput {
  output_dir: string
  manifest_path: string
  canonical_path: string
  diagnostics_path: string
}

export async function runParserPipeline(
  config: ParserPipelineConfig
): Promise<ParserPipelineOutput> {
  const { source_id, raw_run_id, raw_base_dir, output_base_dir } = config

  const reader = new BundleReader(raw_base_dir)

  const run_manifest = await reader.readRunManifest(source_id, raw_run_id)

  const bundles = await Promise.all(
    run_manifest.captures.map((capture) => reader.readCapture(source_id, raw_run_id, capture))
  )

  let parse_results: ParserResult[]

  if (source_id === 'geto') {
    parse_results = parseGetoBundles(bundles)
  } else if (source_id === 'pica') {
    parse_results = parsePicaBundles(bundles)
  } else {
    throw new Error(`Unsupported source_id: ${source_id}`)
  }

  const list_candidates = parse_results
    .filter((r) => r.target_id.includes('list'))
    .flatMap((r) => r.candidates)

  const detail_candidates = parse_results
    .filter((r) => r.target_id.includes('detail'))
    .flatMap((r) => r.candidates)

  const standalone_candidates = parse_results
    .filter((r) => !r.target_id.includes('list') && !r.target_id.includes('detail'))
    .flatMap((r) => r.candidates)

  const { merged, conflicts } = mergeRecords(list_candidates, detail_candidates)
  const merged_candidates = [...merged, ...standalone_candidates]

  const all_diagnostics: ParserDiagnostic[] = parse_results.flatMap((r) => r.diagnostics)
  all_diagnostics.push(...conflictsTodiagnostics(conflicts))

  const { accepted, diagnostics: canonical_diagnostics } = normalizeToCanonical(merged_candidates)
  all_diagnostics.push(...canonical_diagnostics)

  const output_dir = join(output_base_dir, source_id, raw_run_id)
  await mkdir(output_dir, { recursive: true })

  const parser_manifest: ParserManifest = {
    schema_version: 1,
    parser_run_id: raw_run_id,
    source_id,
    raw_run_id,
    parsed_at: new Date().toISOString(),
      parsed_targets: run_manifest.target_ids,
      success_count: accepted.length,
      diagnostic_counts: {
        info: all_diagnostics.filter((d) => d.severity === 'info').length,
        warning: all_diagnostics.filter((d) => d.severity === 'warning').length,
      error: all_diagnostics.filter((d) => d.severity === 'error').length,
    },
  }

  const manifest_path = join(output_dir, 'parser-manifest.json')
  const canonical_path = join(output_dir, 'canonical.json')
  const diagnostics_path = join(output_dir, 'diagnostics.json')

  await Promise.all([
    writeFile(manifest_path, JSON.stringify(parser_manifest, null, 2) + '\n', 'utf-8'),
    writeFile(canonical_path, JSON.stringify(accepted, null, 2) + '\n', 'utf-8'),
    writeFile(diagnostics_path, JSON.stringify(all_diagnostics, null, 2) + '\n', 'utf-8'),
  ])

  return {
    output_dir,
    manifest_path,
    canonical_path,
    diagnostics_path,
  }
}
