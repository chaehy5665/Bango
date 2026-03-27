import { expect, test } from '@playwright/test'

test.describe('Responsive Layout', () => {
  test('375px 모바일 레이아웃에서 하단 네비 표시', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/map')

    const bottomNav = page.locator('nav.fixed.bottom-0.left-0.right-0')
    await expect(bottomNav).toBeVisible()
    await expect(bottomNav.getByRole('link', { name: '지도' })).toBeVisible()
    await expect(bottomNav.getByRole('link', { name: '검색' })).toBeVisible()
    await expect(bottomNav.getByRole('link', { name: '어드민' })).toBeVisible()
    await expect(page.getByRole('button', { name: '필터 열기' })).toBeVisible()
  })
})
