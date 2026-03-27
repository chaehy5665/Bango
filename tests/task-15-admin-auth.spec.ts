import { test, expect } from '@playwright/test'

test.describe('Admin Authentication', () => {
  const adminPassword = process.env.ADMIN_PASSWORD || 'test-password-123'
  const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000'

  test('Successful login with correct password', async ({ page }) => {
    // Navigate to login page
    await page.goto(`${baseUrl}/admin/login`)

    // Wait for form to be ready
    await page.waitForSelector('input[name="password"]')

    // Fill password input with correct password
    await page.fill('input[name="password"]', adminPassword)

    // Submit the form
    await page.click('button[type="submit"]')

    // Wait for navigation and cookie to be set
    await page.waitForTimeout(3000)

    // Check the current URL
    const currentUrl = page.url()
    
    if (currentUrl.includes('/admin/login')) {
      // Still on login page - check if there's an error
      const errorText = await page.$eval('.text-red-700', el => el.textContent).catch(() => 'No error element')
      throw new Error(`Login failed. URL: ${currentUrl}, Error: ${errorText}`)
    }
    
    // Should be on /admin now
    expect(currentUrl).toContain('/admin')

    // Take screenshot
    await page.screenshot({
      path: '.sisyphus/evidence/task-15-admin-login.png',
      fullPage: true,
    })
  })

  test('Wrong password shows error message', async ({ page }) => {
    // Navigate to login page
    await page.goto(`${baseUrl}/admin/login`)

    // Fill password input with wrong password
    await page.fill('input[name="password"]', 'wrong-password')

    // Click login button
    await page.click('button[type="submit"]')

    // Wait for error message
    await page.waitForSelector('text=비밀번호가 일치하지 않습니다')

    // Assert error message is visible
    const errorMessage = page.locator('text=비밀번호가 일치하지 않습니다')
    await expect(errorMessage).toBeVisible()

    // Assert URL is still /admin/login (no redirect)
    expect(page.url()).toContain('/admin/login')

    // Take screenshot
    await page.screenshot({
      path: '.sisyphus/evidence/task-15-wrong-password.png',
      fullPage: true,
    })
  })

  test('Unauthenticated access to /admin redirects to login', async ({ browser }) => {
    // Create new context without cookies (unauthenticated)
    const context = await browser.newContext()
    const page = await context.newPage()

    // Navigate to /admin
    await page.goto(`${baseUrl}/admin`)

    // Should redirect to /admin/login
    await page.waitForURL(`${baseUrl}/admin/login`)
    expect(page.url()).toContain('/admin/login')

    // Take screenshot
    await page.screenshot({
      path: '.sisyphus/evidence/task-15-admin-redirect.png',
      fullPage: true,
    })

    await context.close()
  })
})
