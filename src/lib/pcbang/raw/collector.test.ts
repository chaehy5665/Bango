import assert from 'node:assert/strict'
import { test } from 'bun:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer, type Server } from 'node:http'
import { RawCollector } from '@/lib/pcbang/raw/collector'
import type { CollectorConfig } from '@/lib/pcbang/raw/dto'
import { SOURCE_PRESETS } from '@/lib/pcbang/raw/source-presets'

async function withMockServer(
  run: (ctx: { tmpDir: string; server: Server; serverPort: number; collector: RawCollector }) => Promise<void>
) {
  const tmpDir = await mkdtemp(join(tmpdir(), 'collector-test-'))
  const originalGetoTargets = JSON.parse(JSON.stringify(SOURCE_PRESETS.geto.targets))

  const server = createServer((req, res) => {
    if (req.url === '/success') {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('success response')
      return
    }

    if (req.url === '/json') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('{"status":"ok"}')
      return
    }

    if (req.url === '/error') {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end('error response')
      return
    }

    res.writeHead(404)
    res.end()
  })

  try {
    const serverPort = await new Promise<number>((resolve) => {
      server.listen(0, () => {
        const addr = server.address()
        if (addr && typeof addr !== 'string') {
          resolve(addr.port)
        }
      })
    })

    SOURCE_PRESETS.geto.targets = [
      {
        target_id: 'landing_html',
        method: 'GET',
        url: `http://127.0.0.1:${serverPort}/success`,
        anonymous_safe: true,
        requires_auth: false,
        requires_captcha: false,
        is_mutating: false,
        description: 'test landing',
      },
      {
        target_id: 'district_list_json',
        method: 'POST',
        url: `http://127.0.0.1:${serverPort}/json`,
        request_body: 'areaName1=%EC%84%9C%EC%9A%B8',
        request_headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
        anonymous_safe: true,
        requires_auth: false,
        requires_captcha: false,
        is_mutating: false,
        description: 'test district list',
      },
    ]

    const collector = new RawCollector(tmpDir, 5000)
    await run({ tmpDir, server, serverPort, collector })
  } finally {
    SOURCE_PRESETS.geto.targets = originalGetoTargets
    await rm(tmpDir, { recursive: true, force: true })
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

test('collector captures successful requests from preset targets', async () => {
  await withMockServer(async ({ collector, tmpDir }) => {
    const config: CollectorConfig = {
      source: 'geto',
      targets: null,
      output_dir: tmpDir,
      run_id: 'test-success',
      timeout_ms: 5000,
    }

    const result = await collector.collect(config)
    const manifest = JSON.parse(await readFile(result.manifest_path, 'utf-8'))

    assert.equal(result.source_id, 'geto')
    assert.equal(result.run_id, 'test-success')
    assert.equal(result.success_count, 2)
    assert.equal(result.failure_count, 0)
    assert.equal(result.had_errors, false)
    assert.equal(manifest.captures.length, 2)
    assert.equal(manifest.status, 'success')
  })
})

test('collector records partial failure when one target fails', async () => {
  await withMockServer(async ({ collector, serverPort, tmpDir }) => {
    SOURCE_PRESETS.geto.targets = [
      SOURCE_PRESETS.geto.targets[0],
      {
        target_id: 'failing_target',
        method: 'GET',
        url: `http://127.0.0.1:${serverPort}/error`,
        anonymous_safe: true,
        requires_auth: false,
        requires_captcha: false,
        is_mutating: false,
        description: 'test failure',
      },
    ]

    const config: CollectorConfig = {
      source: 'geto',
      targets: null,
      output_dir: tmpDir,
      run_id: 'test-partial-failure',
      timeout_ms: 5000,
    }

    const result = await collector.collect(config)
    const manifest = JSON.parse(await readFile(result.manifest_path, 'utf-8'))

    assert.equal(result.had_errors, true)
    assert.equal(result.failure_count, 1)
    assert.equal(result.success_count, 1)
    assert.equal(manifest.errors.length, 1)
    assert.equal(manifest.status, 'partial_failure')
  })
})

test('collector respects target filters', async () => {
  await withMockServer(async ({ collector, tmpDir }) => {
    const config: CollectorConfig = {
      source: 'geto',
      targets: ['district_list_json'],
      output_dir: tmpDir,
      run_id: 'test-filter',
      timeout_ms: 5000,
    }

    const result = await collector.collect(config)
    const manifest = JSON.parse(await readFile(result.manifest_path, 'utf-8'))

    assert.equal(result.success_count, 1)
    assert.equal(result.failure_count, 0)
    assert.equal(manifest.target_ids.length, 1)
    assert.equal(manifest.target_ids[0], 'district_list_json')
  })
})
