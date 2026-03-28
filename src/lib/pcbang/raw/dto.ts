export type SourceId = 'geto' | 'pica'

export type HttpMethod = 'GET' | 'POST'

export interface CaptureTargetSpec {
  target_id: string
  method: HttpMethod
  url: string
  request_body?: string
  request_headers?: Record<string, string>
  anonymous_safe: boolean
  requires_auth: boolean
  requires_captcha: boolean
  is_mutating: boolean
  description: string
}

export interface SourcePreset {
  source_id: SourceId
  targets: CaptureTargetSpec[]
}

export interface RedactedHeader {
  name: string
  value: string
  redacted: boolean
}

export interface CaptureMetadata {
  schema_version: 1
  target_id: string
  source_id: SourceId
  captured_at: string
  method: HttpMethod
  request_url: string
  request_headers: RedactedHeader[]
  request_body_sha256: string | null
  request_body_size_bytes: number
  final_url: string
  status_code: number
  response_headers: RedactedHeader[]
  content_type: string | null
  body_size_bytes: number
  body_sha256: string
  anonymous_safe: boolean
  requires_auth: boolean
  requires_captcha: boolean
  is_mutating: boolean
}

export interface CaptureArtifactManifest {
  schema_version: 1
  target_id: string
  ordinal: number
  captured_at: string
  status_code: number
  body_size_bytes: number
  body_sha256: string
  body_filename: string
  metadata_filename: string
  request_body_filename: string | null
}

export interface RunManifest {
  schema_version: 1
  run_id: string
  source_id: SourceId
  started_at: string
  completed_at: string
  status: 'success' | 'partial_failure'
  target_ids: string[]
  success_count: number
  failure_count: number
  captures: CaptureArtifactManifest[]
  errors: Array<{
    target_id: string
    ordinal: number
    error: string
  }>
}

export interface CollectorConfig {
  source: SourceId
  targets: string[] | null
  custom_targets?: CaptureTargetSpec[]
  output_dir: string
  run_id: string
  timeout_ms: number
}
