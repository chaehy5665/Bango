import assert from 'node:assert/strict'
import { test } from 'bun:test'
import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ArtifactStore } from '@/lib/pcbang/raw/artifact-store'

async function withTempStore(run: (store: ArtifactStore, tmpDir: string) => Promise<void>) {
  const tmpDir = await mkdtemp(join(tmpdir(), 'artifact-store-test-'))

  try {
    await run(new ArtifactStore(tmpDir), tmpDir)
  } finally {
    await rm(tmpDir, { recursive: true, force: true })
  }
}

test('getRunDir and getCaptureDir return expected paths', async () => {
  await withTempStore(async (store) => {
    const runDir = store.getRunDir('geto', 'test-run-123')
    const captureDir = store.getCaptureDir('pica', 'test-run-456', 1, 'landing_html')

    assert.ok(runDir.includes('geto'))
    assert.ok(runDir.includes('test-run-123'))
    assert.ok(captureDir.includes('pica'))
    assert.ok(captureDir.includes('test-run-456'))
    assert.ok(captureDir.includes('1-landing_html'))
  })
})

test('ensureRunDir creates the run directory', async () => {
  await withTempStore(async (store) => {
    await store.ensureRunDir('geto', 'test-run-789')
    await access(store.getRunDir('geto', 'test-run-789'))
    assert.ok(true)
  })
})

test('writeCapture creates manifest, metadata, and redacted body files', async () => {
  await withTempStore(async (store) => {
    await store.ensureRunDir('geto', 'test-run-write')

    const requestHeaders = new Headers({
      'User-Agent': 'Test',
      Cookie: 'secret=value',
    })

    const responseBody = new TextEncoder().encode('test response body')
    const mockResponse = new Response(responseBody, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })

    const paths = await store.writeCapture(
      'geto',
      'test-run-write',
      1,
      'landing_html',
      'GET',
      'https://example.com',
      requestHeaders,
      null,
      mockResponse,
      responseBody,
      {
        anonymous_safe: true,
        requires_auth: false,
        requires_captcha: false,
        is_mutating: false,
      }
    )

    const manifest = JSON.parse(await readFile(paths.manifest_path, 'utf-8'))
    const metadata = JSON.parse(await readFile(paths.metadata_path, 'utf-8'))
    const bodyContent = await readFile(paths.body_path, 'utf-8')

    assert.equal(manifest.schema_version, 1)
    assert.equal(manifest.target_id, 'landing_html')
    assert.equal(manifest.status_code, 200)
    assert.equal(metadata.schema_version, 1)
    assert.equal(metadata.method, 'GET')
    assert.equal(metadata.anonymous_safe, true)
    assert.equal(bodyContent, 'test response body')

    const cookieHeader = metadata.request_headers.find((h: { name: string }) => h.name.toLowerCase() === 'cookie')
    assert.ok(cookieHeader)
    assert.equal(cookieHeader.value, '[REDACTED]')
    assert.equal(cookieHeader.redacted, true)
  })
})

test('writeCapture saves request body for form POST requests', async () => {
  await withTempStore(async (store) => {
    await store.ensureRunDir('pica', 'test-run-post')

    const requestBody = new TextEncoder().encode('currentPageNo=1')
    const responseBody = new TextEncoder().encode('{}')
    const mockResponse = new Response(responseBody, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

    const paths = await store.writeCapture(
      'pica',
      'test-run-post',
      1,
      'main_pcbang_list_json',
      'POST',
      'https://example.com/api',
      new Headers({ 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }),
      requestBody,
      mockResponse,
      responseBody,
      {
        anonymous_safe: true,
        requires_auth: false,
        requires_captcha: false,
        is_mutating: false,
      }
    )

    assert.ok(paths.request_body_path)
    assert.equal(paths.request_body_path?.endsWith('request-body.txt'), true)
    assert.equal(await readFile(paths.request_body_path!, 'utf-8'), 'currentPageNo=1')
  })
})

test('writeCapture sniffs JSON bodies even when content-type is text/html', async () => {
  await withTempStore(async (store) => {
    await store.ensureRunDir('geto', 'test-run-json-sniff')

    const responseBody = new TextEncoder().encode('["강남구","서초구"]')
    const mockResponse = new Response(responseBody, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=UTF-8' },
    })

    const paths = await store.writeCapture(
      'geto',
      'test-run-json-sniff',
      1,
      'district_list_json',
      'POST',
      'https://example.com/json',
      new Headers({ 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }),
      new TextEncoder().encode('areaName1=%EC%84%9C%EC%9A%B8'),
      mockResponse,
      responseBody,
      {
        anonymous_safe: true,
        requires_auth: false,
        requires_captcha: false,
        is_mutating: false,
      }
    )

    assert.equal(paths.body_path.endsWith('body.json'), true)
  })
})

test('writeRunManifest creates a partial-failure manifest', async () => {
  await withTempStore(async (store) => {
    await store.ensureRunDir('geto', 'test-run-manifest')

    const manifestPath = await store.writeRunManifest(
      'geto',
      'test-run-manifest',
      '2024-01-01T00:00:00Z',
      '2024-01-01T00:05:00Z',
      ['landing_html', 'district_list_json'],
      [
        {
          schema_version: 1,
          target_id: 'landing_html',
          ordinal: 1,
          captured_at: '2024-01-01T00:01:00Z',
          status_code: 200,
          body_size_bytes: 1024,
          body_sha256: 'abcd1234',
          body_filename: 'body.html',
          metadata_filename: 'metadata.json',
          request_body_filename: null,
        },
      ],
      [{ target_id: 'district_list_json', ordinal: 2, error: 'timeout' }]
    )

    const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'))
    assert.equal(manifest.schema_version, 1)
    assert.equal(manifest.run_id, 'test-run-manifest')
    assert.equal(manifest.source_id, 'geto')
    assert.equal(manifest.status, 'partial_failure')
    assert.equal(manifest.success_count, 1)
    assert.equal(manifest.failure_count, 1)
    assert.equal(manifest.captures.length, 1)
    assert.equal(manifest.errors.length, 1)
  })
})
