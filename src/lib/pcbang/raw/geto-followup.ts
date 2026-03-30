import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { CaptureTargetSpec, RunManifest } from '@/lib/pcbang/raw/dto'
import { RawCollector, type CollectorResult } from '@/lib/pcbang/raw/collector'

export interface GetoFollowupOptions {
  from_run_id: string
  raw_base_dir: string
  run_id?: string
  timeout_ms?: number
  max_details?: number
}

export async function extractGetoDetailTargets(
  raw_base_dir: string,
  from_run_id: string
): Promise<CaptureTargetSpec[]> {
  const manifest_path = join(raw_base_dir, 'geto', from_run_id, 'run-manifest.json')
  const manifest_content = await readFile(manifest_path, 'utf-8')
  const manifest = JSON.parse(manifest_content) as RunManifest

  const list_captures = manifest.captures.filter(
    (c) => c.target_id.endsWith('_list_html') || c.target_id.includes('_page_')
  )

  if (list_captures.length === 0) {
    throw new Error(`No list captures found in run ${from_run_id}`)
  }

  const detail_target_by_shop_seq = new Map<string, CaptureTargetSpec>()

  for (const list_capture of list_captures) {
    const capture_dir = join(
      raw_base_dir,
      'geto',
      from_run_id,
      'captures',
      `${list_capture.ordinal}-${list_capture.target_id}`
    )
    const body_path = join(capture_dir, list_capture.body_filename)
    const html = await readFile(body_path, 'utf-8')

    const detail_link_pattern = /href="([^"]*pcbang_find_detail\.html\?[^\"]*shop_seq=(\d+)[^\"]*)"/g
    let match: RegExpExecArray | null

    while ((match = detail_link_pattern.exec(html)) !== null) {
      const href = match[1]
      const shop_seq = match[2]
      if (!detail_target_by_shop_seq.has(shop_seq)) {
        detail_target_by_shop_seq.set(shop_seq, buildGetoDetailTarget(shop_seq, href))
      }
    }
  }

  if (detail_target_by_shop_seq.size === 0) {
    throw new Error(`No detail hrefs with shop_seq found in list captures from ${from_run_id}`)
  }

  return Array.from(detail_target_by_shop_seq.values())
}

export function buildGetoDetailTarget(shop_seq: string, href?: string): CaptureTargetSpec {
  const absolute_url = href
    ? new URL(href, 'https://www.playgeto.com').toString()
    : `https://www.playgeto.com/landing/pcbang_find_detail.html?shop_seq=${shop_seq}&s_target=A`

  return {
    target_id: `detail_shop_seq_${shop_seq}`,
    method: 'GET',
    url: absolute_url,
    anonymous_safe: true,
    requires_auth: false,
    requires_captcha: false,
    is_mutating: false,
    description: `GetO detail page for shop_seq=${shop_seq}`,
  }
}

export async function runGetoFollowup(options: GetoFollowupOptions): Promise<CollectorResult> {
  let targets = await extractGetoDetailTargets(options.raw_base_dir, options.from_run_id)

  if (options.max_details && options.max_details > 0) {
    targets = targets.slice(0, options.max_details)
  }

  if (targets.length === 0) {
    throw new Error('No detail targets extracted from list')
  }

  const new_run_id = options.run_id ?? `${options.from_run_id}-followup-${Date.now()}`
  const timeout_ms = options.timeout_ms ?? 30000

  const collector = new RawCollector(options.raw_base_dir, timeout_ms)

  return await collector.collect({
    source: 'geto',
    targets: null,
    custom_targets: targets,
    output_dir: options.raw_base_dir,
    run_id: new_run_id,
    timeout_ms,
  })
}
