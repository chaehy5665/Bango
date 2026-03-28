import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { CaptureTargetSpec, RunManifest } from '@/lib/pcbang/raw/dto'
import { buildPicaInfoDetailTarget, buildPicaMapDetailTarget } from '@/lib/pcbang/raw/source-presets'
import { RawCollector, type CollectorResult } from '@/lib/pcbang/raw/collector'

interface PicaVenueSeed {
  seq: number
  pcbang_id: string
  name: string
  address: string
}

interface PicaFollowupOptions {
  from_run_id: string
  raw_base_dir: string
  run_id?: string
  limit?: number
  seoul_only?: boolean
  timeout_ms?: number
}

export async function extractPicaSeeds(
  raw_base_dir: string,
  from_run_id: string
): Promise<PicaVenueSeed[]> {
  const manifest_path = join(raw_base_dir, 'pica', from_run_id, 'run-manifest.json')
  const manifest_content = await readFile(manifest_path, 'utf-8')
  const manifest = JSON.parse(manifest_content) as RunManifest

  const list_capture = manifest.captures.find((c) => c.target_id === 'main_pcbang_list_json')
  if (!list_capture) {
    throw new Error(`No main_pcbang_list_json capture found in run ${from_run_id}`)
  }

  const capture_dir = join(
    raw_base_dir,
    'pica',
    from_run_id,
    'captures',
    `${list_capture.ordinal}-${list_capture.target_id}`
  )
  const body_path = join(capture_dir, list_capture.body_filename)
  const body_content = await readFile(body_path, 'utf-8')
  const body = JSON.parse(body_content) as { pcbangList?: Array<Record<string, unknown>> }

  if (!Array.isArray(body.pcbangList)) {
    throw new Error('pcbangList is not an array in the source run')
  }

  const seeds: PicaVenueSeed[] = []
  for (const record of body.pcbangList) {
    if (typeof record.SEQ === 'number' && typeof record.PCBANGID === 'string') {
      seeds.push({
        seq: record.SEQ,
        pcbang_id: record.PCBANGID,
        name: typeof record.PCBANGNAME === 'string' ? record.PCBANGNAME : '',
        address: typeof record.ADDRESS === 'string' ? record.ADDRESS : '',
      })
    }
  }

  return seeds
}

export function filterSeoulSeeds(seeds: PicaVenueSeed[]): PicaVenueSeed[] {
  return seeds.filter((seed) => {
    const addr = seed.address.toLowerCase()
    return addr.includes('서울')
  })
}

export function buildFollowupTargets(seeds: PicaVenueSeed[]): CaptureTargetSpec[] {
  const targets: CaptureTargetSpec[] = []
  for (const seed of seeds) {
    targets.push(buildPicaInfoDetailTarget(seed.seq))
    targets.push(buildPicaMapDetailTarget(seed.seq))
  }
  return targets
}

export async function runPicaFollowup(options: PicaFollowupOptions): Promise<CollectorResult> {
  let seeds = await extractPicaSeeds(options.raw_base_dir, options.from_run_id)

  if (options.seoul_only) {
    seeds = filterSeoulSeeds(seeds)
  }

  if (options.limit && options.limit > 0) {
    seeds = seeds.slice(0, options.limit)
  }

  if (seeds.length === 0) {
    throw new Error('No seeds available after filtering')
  }

  const targets = buildFollowupTargets(seeds)
  const new_run_id = options.run_id ?? `${options.from_run_id}-followup-${Date.now()}`
  const timeout_ms = options.timeout_ms ?? 30000

  const collector = new RawCollector(options.raw_base_dir, timeout_ms)

  return await collector.collect({
    source: 'pica',
    targets: null,
    custom_targets: targets,
    output_dir: options.raw_base_dir,
    run_id: new_run_id,
    timeout_ms,
  })
}
