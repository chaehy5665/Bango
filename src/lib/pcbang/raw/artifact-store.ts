import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import type {
  CaptureArtifactManifest,
  CaptureMetadata,
  HttpMethod,
  RedactedHeader,
  RunManifest,
  SourceId,
} from '@/lib/pcbang/raw/dto'

const SENSITIVE_HEADER_PATTERNS = [
  /^cookie$/i,
  /^authorization$/i,
  /^x-api-key$/i,
  /^x-auth-token$/i,
  /^set-cookie$/i,
]

function shouldRedactHeader(name: string): boolean {
  return SENSITIVE_HEADER_PATTERNS.some((pattern) => pattern.test(name))
}

function redactHeaders(headers: Headers): RedactedHeader[] {
  const result: RedactedHeader[] = []
  headers.forEach((value, name) => {
    const redacted = shouldRedactHeader(name)
    result.push({
      name,
      value: redacted ? '[REDACTED]' : value,
      redacted,
    })
  })
  return result
}

function sha256(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex')
}

function looksLikeJson(data: Uint8Array): boolean {
  const text = new TextDecoder().decode(data.slice(0, 256)).trimStart()
  return text.startsWith('{') || text.startsWith('[')
}

function inferExtension(contentType: string | null, data: Uint8Array): string {
  if (!contentType) {
    return looksLikeJson(data) ? 'json' : 'bin'
  }

  const lower = contentType.toLowerCase()
  if (lower.includes('json')) {
    return 'json'
  }
  if ((lower.includes('html') || lower.includes('text')) && looksLikeJson(data)) {
    return 'json'
  }
  if (lower.includes('html')) {
    return 'html'
  }
  if (lower.includes('xml')) {
    return 'xml'
  }
  if (lower.includes('text')) {
    return 'txt'
  }
  return 'bin'
}

function inferRequestBodyFilename(headers: Headers): string {
  const contentType = headers.get('content-type')?.toLowerCase() ?? null

  if (!contentType) {
    return 'request-body.bin'
  }

  if (contentType.includes('json')) {
    return 'request-body.json'
  }

  if (contentType.includes('x-www-form-urlencoded')) {
    return 'request-body.txt'
  }

  if (contentType.includes('text')) {
    return 'request-body.txt'
  }

  return 'request-body.bin'
}

export interface CaptureArtifactPaths {
  capture_dir: string
  manifest_path: string
  metadata_path: string
  body_path: string
  request_body_path: string | null
}

export class ArtifactStore {
  private base_dir: string

  constructor(base_dir: string) {
    this.base_dir = base_dir
  }

  getRunDir(source_id: SourceId, run_id: string): string {
    return join(this.base_dir, source_id, run_id)
  }

  getCaptureDir(source_id: SourceId, run_id: string, ordinal: number, target_id: string): string {
    return join(this.getRunDir(source_id, run_id), 'captures', `${ordinal}-${target_id}`)
  }

  async ensureRunDir(source_id: SourceId, run_id: string): Promise<void> {
    const run_dir = this.getRunDir(source_id, run_id)
    await mkdir(run_dir, { recursive: true })
  }

  async writeCapture(
    source_id: SourceId,
    run_id: string,
    ordinal: number,
    target_id: string,
    method: HttpMethod,
    request_url: string,
    request_headers: Headers,
    request_body: Uint8Array | null,
    response: Response,
    response_body: Uint8Array,
    spec_flags: {
      anonymous_safe: boolean
      requires_auth: boolean
      requires_captcha: boolean
      is_mutating: boolean
    }
  ): Promise<CaptureArtifactPaths> {
    const capture_dir = this.getCaptureDir(source_id, run_id, ordinal, target_id)
    await mkdir(capture_dir, { recursive: true })

    const content_type = response.headers.get('content-type')
    const extension = inferExtension(content_type, response_body)
    const body_filename = `body.${extension}`
    const body_path = join(capture_dir, body_filename)

    await writeFile(body_path, response_body)

    let request_body_path: string | null = null
    let request_body_filename: string | null = null
    let request_body_sha: string | null = null
    let request_body_size = 0

    if (request_body) {
      request_body_filename = inferRequestBodyFilename(request_headers)
      request_body_path = join(capture_dir, request_body_filename)
      await writeFile(request_body_path, request_body)
      request_body_sha = sha256(request_body)
      request_body_size = request_body.length
    }

    const body_sha = sha256(response_body)

    const metadata: CaptureMetadata = {
      schema_version: 1,
      target_id,
      source_id,
      captured_at: new Date().toISOString(),
      method,
      request_url,
      request_headers: redactHeaders(request_headers),
      request_body_sha256: request_body_sha,
      request_body_size_bytes: request_body_size,
      final_url: response.url,
      status_code: response.status,
      response_headers: redactHeaders(response.headers),
      content_type,
      body_size_bytes: response_body.length,
      body_sha256: body_sha,
      ...spec_flags,
    }

    const metadata_path = join(capture_dir, 'metadata.json')
    await writeFile(metadata_path, JSON.stringify(metadata, null, 2) + '\n', 'utf-8')

    const manifest: CaptureArtifactManifest = {
      schema_version: 1,
      target_id,
      ordinal,
      captured_at: metadata.captured_at,
      status_code: response.status,
      body_size_bytes: response_body.length,
      body_sha256: body_sha,
      body_filename,
      metadata_filename: 'metadata.json',
      request_body_filename,
    }

    const manifest_path = join(capture_dir, 'manifest.json')
    await writeFile(manifest_path, JSON.stringify(manifest, null, 2) + '\n', 'utf-8')

    return {
      capture_dir,
      manifest_path,
      metadata_path,
      body_path,
      request_body_path,
    }
  }

  async writeRunManifest(
    source_id: SourceId,
    run_id: string,
    started_at: string,
    completed_at: string,
    target_ids: string[],
    captures: CaptureArtifactManifest[],
    errors: Array<{ target_id: string; ordinal: number; error: string }>
  ): Promise<string> {
    const run_dir = this.getRunDir(source_id, run_id)
    const manifest: RunManifest = {
      schema_version: 1,
      run_id,
      source_id,
      started_at,
      completed_at,
      status: errors.length === 0 ? 'success' : 'partial_failure',
      target_ids,
      success_count: captures.length,
      failure_count: errors.length,
      captures,
      errors,
    }

    const manifest_path = join(run_dir, 'run-manifest.json')
    await writeFile(manifest_path, JSON.stringify(manifest, null, 2) + '\n', 'utf-8')
    return manifest_path
  }
}
