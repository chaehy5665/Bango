import { expect, test } from '@playwright/test'

test.describe('PWA Manifest', () => {
  test('manifest 응답 및 아이콘 파일 확인', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest')
    expect(response.ok()).toBeTruthy()
    expect(response.headers()['content-type']).toContain('application/manifest+json')

    const manifest = await response.json()
    expect(manifest.name).toBe('방고 - 서울 PC방 가격비교')
    expect(manifest.short_name).toBe('방고')

    const icon192 = manifest.icons.find((icon: { src: string }) => icon.src === '/icons/icon-192x192.png')
    const icon512 = manifest.icons.find((icon: { src: string }) => icon.src === '/icons/icon-512x512.png')
    expect(icon192).toBeTruthy()
    expect(icon512).toBeTruthy()

    const icon192Response = await request.get('/icons/icon-192x192.png')
    const icon512Response = await request.get('/icons/icon-512x512.png')
    expect(icon192Response.ok()).toBeTruthy()
    expect(icon512Response.ok()).toBeTruthy()
    expect(icon192Response.headers()['content-type']).toContain('image/png')
    expect(icon512Response.headers()['content-type']).toContain('image/png')
  })
})
