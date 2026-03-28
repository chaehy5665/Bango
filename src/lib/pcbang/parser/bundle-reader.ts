import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { CaptureArtifactManifest, CaptureMetadata, RunManifest } from '@/lib/pcbang/raw/dto'

export interface CaptureBundle {
  target_id: string
  ordinal: number
  manifest: CaptureArtifactManifest
  metadata: CaptureMetadata
  body: string | object
  request_body: string | object | null
}

export class BundleReader {
  constructor(private raw_base_dir: string) {}

  async readRunManifest(source_id: string, run_id: string): Promise<RunManifest> {
    const manifest_path = join(this.raw_base_dir, source_id, run_id, 'run-manifest.json')
    const content = await readFile(manifest_path, 'utf-8')
    return JSON.parse(content)
  }

  async readCapture(
    source_id: string,
    run_id: string,
    capture_manifest: CaptureArtifactManifest
  ): Promise<CaptureBundle> {
    const capture_dir = join(
      this.raw_base_dir,
      source_id,
      run_id,
      'captures',
      `${capture_manifest.ordinal}-${capture_manifest.target_id}`
    )

    const manifest_path = join(capture_dir, 'manifest.json')
    const metadata_path = join(capture_dir, 'metadata.json')
    const body_path = join(capture_dir, capture_manifest.body_filename)

    const [manifest_content, metadata_content, body_content] = await Promise.all([
      readFile(manifest_path, 'utf-8'),
      readFile(metadata_path, 'utf-8'),
      readFile(body_path, 'utf-8'),
    ])

    const manifest = JSON.parse(manifest_content) as CaptureArtifactManifest
    const metadata = JSON.parse(metadata_content) as CaptureMetadata

    let body: string | object = body_content
    if (capture_manifest.body_filename.endsWith('.json')) {
      try {
        body = JSON.parse(body_content)
      } catch {
        body = body_content
      }
    }

    let request_body: string | object | null = null
    if (capture_manifest.request_body_filename) {
      const request_body_path = join(capture_dir, capture_manifest.request_body_filename)
      const request_body_content = await readFile(request_body_path, 'utf-8')

      if (capture_manifest.request_body_filename.endsWith('.json')) {
        try {
          request_body = JSON.parse(request_body_content)
        } catch {
          request_body = request_body_content
        }
      } else {
        request_body = request_body_content
      }
    }

    return {
      target_id: capture_manifest.target_id,
      ordinal: capture_manifest.ordinal,
      manifest,
      metadata,
      body,
      request_body,
    }
  }
}
