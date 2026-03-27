import { expect, test } from '@playwright/test'

test.describe('Dark Mode', () => {
  test('테마 전환 및 가독성 확인', async ({ page }) => {
    await page.goto('/search')

    const toggle = page.locator('[data-testid="theme-toggle"]:visible').first()
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('title', /다크 모드로 전환|시스템 테마로 전환|라이트 모드로 전환/)

    const before = await page.evaluate(() => ({
      dark: document.documentElement.classList.contains('dark'),
      background: getComputedStyle(document.body).backgroundColor,
      foreground: getComputedStyle(document.body).color,
    }))
    const beforeTitle = await toggle.getAttribute('title')

    await toggle.evaluate((element) => {
      ;(element as HTMLButtonElement).click()
    })

    const after = await page.evaluate(() => ({
      dark: document.documentElement.classList.contains('dark'),
      background: getComputedStyle(document.body).backgroundColor,
      foreground: getComputedStyle(document.body).color,
    }))
    const afterTitle = await toggle.getAttribute('title')

    expect(
      after.dark !== before.dark ||
        after.background !== before.background ||
        afterTitle !== beforeTitle
    ).toBeTruthy()
    expect(after.background).not.toBe(after.foreground)
  })
})
