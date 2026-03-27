import { test, expect, type Page } from '@playwright/test'

const ADMIN_PASSWORD = 'test-password-123'
const BASE_URL = 'http://localhost:3000'

async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/admin/login`)
  await page.fill('input[name="password"]', ADMIN_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE_URL}/admin`)
}

test.describe('Task 16: Admin CRUD Panel', () => {
  test('Scenario 1: Create venue', async ({ page }) => {
    // Listen for console messages
    page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()))
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message))

    await loginAsAdmin(page)
    await loginAsAdmin(page)

    await page.click('a:has-text("PC방 추가")')
    await page.waitForURL(`${BASE_URL}/admin/venues/new`)

    await page.fill('input[name="name"]', '테스트PC방')
    await page.fill('input[name="address_full"]', '서울시 테스트구 테스트로 123')
    await page.fill('input[name="address_district"]', '테스트구')
    await page.fill('input[name="latitude"]', '37.5')
    await page.fill('input[name="longitude"]', '127.0')

    await page.fill('input[name="pricing_0_tier_name"]', '기본')
    await page.fill('input[name="pricing_0_hourly"]', '1500')

    await page.fill('input[name="cpu"]', 'Intel i5')
    await page.fill('input[name="gpu"]', 'RTX 4060')
    await page.fill('input[name="ram_gb"]', '16')
    await page.fill('input[name="storage"]', 'SSD 512GB')
    await page.fill('input[name="monitor"]', '27인치 144Hz')
    await page.fill('input[name="peripheral_0_brand"]', 'Logitech')
    await page.fill('input[name="menu_0_item_name"]', '콜라')
    await page.fill('input[name="menu_0_price_krw"]', '2000')

    // Wait for form to be fully interactive before submit
    await page.waitForTimeout(500)

    await page.click('button[type="submit"]:has-text("저장")')
    
    await page.waitForURL(`${BASE_URL}/admin`, { timeout: 10000 })

    const venueExists = await page.locator('td:has-text("테스트PC방")').count()
    expect(venueExists).toBeGreaterThan(0)

    await page.screenshot({ 
      path: '.sisyphus/evidence/task-16-admin-create.png',
      fullPage: true 
    })
  })

  test('Scenario 2: Update venue', async ({ page }) => {
    await loginAsAdmin(page)

    const firstEditButton = page.locator('a:has-text("수정")').first()
    await firstEditButton.click()

    await page.waitForURL(/\/admin\/venues\/.*\/edit/)

    await page.fill('input[name="name"]', '수정된이름')

    await page.click('button[type="submit"]:has-text("저장")')
    
    await page.waitForURL(`${BASE_URL}/admin`, { timeout: 10000 })

    const venueExists = await page.locator('td:has-text("수정된이름")').count()
    expect(venueExists).toBeGreaterThan(0)

    await page.screenshot({ 
      path: '.sisyphus/evidence/task-16-admin-update.png',
      fullPage: true 
    })
  })

  test('Scenario 3: Delete venue', async ({ page }) => {
    await loginAsAdmin(page)

    const initialRows = await page.locator('tbody tr').count()

    const lastDeleteButton = page.locator('button:has-text("삭제")').last()
    await lastDeleteButton.click()

    await page.waitForSelector('[role="alertdialog"]')

    const confirmDeleteButton = page.locator('[role="alertdialog"] button:has-text("삭제")').last()
    await confirmDeleteButton.click()

    await page.waitForTimeout(2000)

    const finalRows = await page.locator('tbody tr').count()
    expect(finalRows).toBe(initialRows - 1)

    await page.screenshot({ 
      path: '.sisyphus/evidence/task-16-admin-delete.png',
      fullPage: true 
    })
  })
})
