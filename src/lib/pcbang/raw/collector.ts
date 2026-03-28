import { readFile } from 'node:fs/promises'
import type { CaptureArtifactManifest, CaptureTargetSpec, CollectorConfig, SourceId } from '@/lib/pcbang/raw/dto'
import { ArtifactStore } from '@/lib/pcbang/raw/artifact-store'
import { getSourcePreset, getTargetsByIds, guardPresetSafety } from '@/lib/pcbang/raw/source-presets'

export interface CollectorResult {
  run_id: string
  source_id: SourceId
  started_at: string
  completed_at: string
  success_count: number
  failure_count: number
  manifest_path: string
  had_errors: boolean
}

interface CaptureError {
  target_id: string
  ordinal: number
  error: string
}

export class RawCollector {
  private store: ArtifactStore
  private timeout_ms: number

  constructor(output_dir: string, timeout_ms: number) {
    this.store = new ArtifactStore(output_dir)
    this.timeout_ms = timeout_ms
  }

  async collect(config: CollectorConfig): Promise<CollectorResult> {
    let targets: CaptureTargetSpec[]

    if (config.custom_targets && config.custom_targets.length > 0) {
      targets = config.custom_targets
      const custom_preset = { source_id: config.source, targets: config.custom_targets }
      guardPresetSafety(custom_preset)
    } else {
      const preset = getSourcePreset(config.source)
      guardPresetSafety(preset)
      targets = config.targets ? getTargetsByIds(config.source, config.targets) : preset.targets
    }

    const started_at = new Date().toISOString()
    await this.store.ensureRunDir(config.source, config.run_id)

    const captures: CaptureArtifactManifest[] = []
    const errors: CaptureError[] = []

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i]
      const ordinal = i + 1

      try {
        const capture_manifest = await this.captureTarget(config.source, config.run_id, ordinal, target)
        captures.push(capture_manifest)
      } catch (error) {
        const error_message = error instanceof Error ? error.message : String(error)
        errors.push({
          target_id: target.target_id,
          ordinal,
          error: error_message,
        })
      }
    }

    const completed_at = new Date().toISOString()

    const manifest_path = await this.store.writeRunManifest(
      config.source,
      config.run_id,
      started_at,
      completed_at,
      targets.map((t) => t.target_id),
      captures,
      errors
    )

    return {
      run_id: config.run_id,
      source_id: config.source,
      started_at,
      completed_at,
      success_count: captures.length,
      failure_count: errors.length,
      manifest_path,
      had_errors: errors.length > 0,
    }
  }

  private async captureTarget(
    source_id: SourceId,
    run_id: string,
    ordinal: number,
    target: CaptureTargetSpec
  ): Promise<CaptureArtifactManifest> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeout_ms)

    try {
      const request_headers = new Headers({
        'User-Agent': 'Mozilla/5.0 (compatible; BangoRawCollector/1.0)',
        Accept: '*/*',
      })

      if (target.request_headers) {
        for (const [name, value] of Object.entries(target.request_headers)) {
          request_headers.set(name, value)
        }
      }

      let request_body_bytes: Uint8Array | null = null
      const fetch_options: RequestInit = {
        method: target.method,
        headers: request_headers,
        signal: controller.signal,
      }

      if (target.method === 'POST' && target.request_body) {
        fetch_options.body = target.request_body
        request_body_bytes = new TextEncoder().encode(target.request_body)
      }

      const response = await fetch(target.url, fetch_options)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const response_body = new Uint8Array(await response.arrayBuffer())

      const paths = await this.store.writeCapture(
        source_id,
        run_id,
        ordinal,
        target.target_id,
        target.method,
        target.url,
        request_headers,
        request_body_bytes,
        response,
        response_body,
        {
          anonymous_safe: target.anonymous_safe,
          requires_auth: target.requires_auth,
          requires_captcha: target.requires_captcha,
          is_mutating: target.is_mutating,
        }
      )

      const manifest_content = await readFile(paths.manifest_path, 'utf-8')
      return JSON.parse(manifest_content) as CaptureArtifactManifest
    } finally {
      clearTimeout(timeout)
    }
  }
}

export async function runCollector(config: CollectorConfig): Promise<CollectorResult> {
  const collector = new RawCollector(config.output_dir, config.timeout_ms)
  return await collector.collect(config)
}
