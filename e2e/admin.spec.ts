import { expect, test } from '@playwright/test'

test.describe('Admin CRUD', () => {
  test('로그인 후 생성/수정/삭제 동작', async ({ page }) => {
    const adminPassword = process.env.ADMIN_PASSWORD
    test.skip(!adminPassword, 'ADMIN_PASSWORD is required for admin login test')

    const name = `E2E 테스트 PC방 ${Date.now()}`
    const updatedName = `${name} 수정`

    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/login/)

    await page.fill('input[name="password"]', adminPassword || '')
    await page.getByRole('button', { name: '로그인' }).click()
    await expect(page).toHaveURL(/\/admin$/)

    await page.getByRole('link', { name: 'PC방 추가' }).click()
    await expect(page).toHaveURL(/\/admin\/venues\/new/)

    await page.fill('input[name="name"]', name)
    await page.fill('input[name="address_district"]', '강남구')
    await page.fill('input[name="address_full"]', '서울특별시 강남구 강남대로 396')
    await page.fill('input[name="latitude"]', '37.4979')
    await page.fill('input[name="longitude"]', '127.0286')
    await page.fill('input[name="pricing_0_tier_name"]', '기본')
    await page.fill('input[name="cpu"]', 'Intel i5-13400F')
    await page.fill('input[name="gpu"]', 'RTX 4060')
    await page.fill('input[name="ram_gb"]', '16')
    await page.fill('input[name="storage"]', 'SSD 512GB')
    await page.fill('input[name="monitor"]', '27인치 144Hz')
    await page.fill('input[name="peripheral_0_brand"]', 'Logitech')
    await page.fill('input[name="menu_0_item_name"]', '콜라')
    await page.fill('input[name="menu_0_price_krw"]', '2000')

    await page.getByRole('button', { name: '저장' }).click()
    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.locator('tr', { hasText: name })).toBeVisible()

    const createdRow = page.locator('tr', { hasText: name })
    await createdRow.getByRole('link', { name: '수정' }).click()
    await expect(page).toHaveURL(/\/admin\/venues\/.+\/edit/)

    await page.fill('input[name="name"]', updatedName)
    await page.getByRole('button', { name: '저장' }).click()

    await expect(page).toHaveURL(/\/admin$/)
    await expect(page.locator('tr', { hasText: updatedName })).toBeVisible()

    const updatedRow = page.locator('tr', { hasText: updatedName })
    await updatedRow.getByRole('button', { name: '삭제' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: '삭제' }).click()

    await expect(page.locator('tr', { hasText: updatedName })).toHaveCount(0)
  })
})
