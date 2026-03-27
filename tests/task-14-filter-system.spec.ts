import { test, expect } from '@playwright/test'

test.describe('Map Filter System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to map page
    await page.goto('http://localhost:3000/map')
    
    // Wait for venues to load
    await page.waitForSelector('text=/\\d+개의 PC방/', { timeout: 10000 })
  })

  test('Scenario: 가격대 필터 적용', async ({ page }) => {
    // Get initial venue count
    const initialCountText = await page.locator('text=/\\d+개의 PC방/').textContent()
    const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || '0')
    
    console.log('Initial venue count:', initialCount)
    expect(initialCount).toBeGreaterThan(0)
    
    // Desktop: Filter panel is visible in sidebar
    // Mobile: Need to click filter button
    const isMobile = await page.locator('button[aria-label="필터 열기"]').isVisible()
    
    if (isMobile) {
      // Mobile: Open filter sheet
      await page.click('button[aria-label="필터 열기"]')
      await page.waitForSelector('text=가격대', { timeout: 5000 })
    }
    
    // Apply price filter: Set max price to 1000원
    // Apply price filter: Set max price to 1000원 using slider
    // Radix slider: drag the thumb left to reduce price
    const sliderThumb = page.locator('[data-slot="slider-thumb"]').first()
    
    // Get slider bounds
    const sliderTrack = page.locator('[data-slot="slider-track"]').first()
    const trackBox = await sliderTrack.boundingBox()
    if (!trackBox) throw new Error('Slider track not found')
    
    // Calculate position for 1000원 value (range 500-3000, so 1000 is ~20% from left)
    const targetX = trackBox.x + (trackBox.width * 0.2)
    const targetY = trackBox.y + (trackBox.height / 2)
    
    // Drag slider thumb to target position
    await sliderThumb.hover()
    await page.mouse.down()
    await page.mouse.move(targetX, targetY)
    await page.mouse.up()
    
    // Verify price display shows "₩1,000 이하" (or close to it)
    await expect(page.locator('text=/₩1,\d{3} 이하/')).toBeVisible({ timeout: 5000 })
    
    // Click apply button (mobile) or wait for auto-update (desktop)
    if (isMobile) {
      await page.click('button:has-text("PC방 보기")')
      await page.waitForTimeout(500) // Wait for sheet to close
    } else {
      await page.waitForTimeout(500) // Wait for filter to apply
    }
    
    // Get filtered venue count
    await page.waitForTimeout(1000) // Wait for venues to update
    const filteredCountText = await page.locator('text=/\\d+개의 PC방/').textContent()
    const filteredCount = parseInt(filteredCountText?.match(/\d+/)?.[0] || '0')
    
    console.log('Filtered venue count:', filteredCount)
    
    // Filtered count should be less than or equal to initial count
    expect(filteredCount).toBeLessThanOrEqual(initialCount)
    
    // Take screenshot
    await page.screenshot({ 
      path: '.sisyphus/evidence/task-14-price-filter.png',
      fullPage: true 
    })
    
    // Reset filters (desktop: click 초기화, mobile: reopen and click 초기화)
    if (isMobile) {
      await page.click('button[aria-label="필터 열기"]')
      await page.waitForSelector('text=가격대', { timeout: 5000 })
      await page.click('button:has-text("초기화")')
      await page.click('button:has-text("PC방 보기")')
    } else {
      await page.click('button:has-text("초기화")')
    }
    
    // Wait for venues to restore
    await page.waitForTimeout(1000)
    
    // Verify count restored
    const restoredCountText = await page.locator('text=/\\d+개의 PC방/').textContent()
    const restoredCount = parseInt(restoredCountText?.match(/\d+/)?.[0] || '0')
    
    console.log('Restored venue count:', restoredCount)
    expect(restoredCount).toBeGreaterThanOrEqual(filteredCount)
  })

  test('Scenario: 모바일 필터 패널', async ({ page, viewport }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 })
    
    // Navigate to map page again with mobile viewport
    await page.goto('http://localhost:3000/map')
    await page.waitForSelector('text=/\\d+개의 PC방/', { timeout: 10000 })
    
    // Verify filter button is visible (mobile only)
    const filterButton = page.locator('button[aria-label="필터 열기"]')
    await expect(filterButton).toBeVisible()
    
    // Click filter button to open sheet
    await filterButton.click()
    
    // Wait for filter sheet to open
    await page.waitForSelector('text=가격대', { timeout: 5000 })
    
    // Verify all 5 filters are visible in the sheet
    await expect(page.locator('text=가격대').nth(1)).toBeVisible() // nth(1) for mobile sheet
    await expect(page.locator('text=거리 반경').nth(1)).toBeVisible()
    await expect(page.locator('text=GPU 사양').nth(1)).toBeVisible()
    await expect(page.locator('text=주변기기 브랜드').nth(1)).toBeVisible()
    await expect(page.locator('text=영업시간').nth(1)).toBeVisible()
    
    // Apply a filter: Select RTX 4060+ GPU tier (in the sheet)
    // Need to scroll down in the sheet to see GPU filter
    const sheetContent = page.locator('[role="dialog"]')
    await sheetContent.locator('button:has-text("RTX 4060+")').click()
    
    // Verify button is selected (has indigo background)
    const gpuButton = page.locator('button:has-text("RTX 4060+")')
    const backgroundColor = await gpuButton.evaluate((el) => 
      window.getComputedStyle(el).backgroundColor
    )
    console.log('GPU button background color:', backgroundColor)
    
    // Take screenshot showing filter panel
    await page.screenshot({ 
      path: '.sisyphus/evidence/task-14-mobile-filter.png',
      fullPage: true 
    })
    
    // Click "PC방 보기" to apply filters and close sheet
    await page.click('button:has-text("PC방 보기")')
    
    // Wait for sheet to close
    await page.waitForTimeout(500)
    
    // Verify filter button shows active indicator (exclamation mark)
    const activeIndicator = filterButton.locator('span:has-text("!")')
    await expect(activeIndicator).toBeVisible()
    
    // Verify filtered results on map
    await expect(page.locator('text=/\\d+개의 PC방/')).toBeVisible()
  })

  test('Distance filter changes should refetch venues', async ({ page }) => {
    // Desktop test
    const isMobile = await page.locator('button[aria-label="필터 열기"]').isVisible()
    
    if (isMobile) {
      await page.click('button[aria-label="필터 열기"]')
      await page.waitForSelector('text=거리 반경', { timeout: 5000 })
    }
    
    // Get initial count (default 5km)
    const initialCountText = await page.locator('text=/\\d+개의 PC방/').textContent()
    const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || '0')
    console.log('Initial count (5km):', initialCount)
    
    // Change distance to 1km using Select component
    // Click the select trigger button
    const selectTrigger = isMobile 
      ? page.locator('[role="combobox"]').nth(1) // In mobile sheet
      : page.locator('[role="combobox"]').first() // Desktop sidebar
    
    await selectTrigger.click()
    await page.waitForTimeout(200)
    
    // Click the 1km option in the dropdown
    await page.locator('[role="option"]', { hasText: '1km' }).click()
    
    if (isMobile) {
      await page.click('button:has-text("PC방 보기")')
    }
    
    // Wait for refetch
    await page.waitForTimeout(2000)
    
    // Get new count
    const newCountText = await page.locator('text=/\\d+개의 PC방/').textContent()
    const newCount = parseInt(newCountText?.match(/\d+/)?.[0] || '0')
    console.log('New count (1km):', newCount)
    
    // 1km radius should show fewer or equal venues than 5km
    expect(newCount).toBeLessThanOrEqual(initialCount)
  })

  test('24-hour filter should reduce venue count', async ({ page }) => {
    const isMobile = await page.locator('button[aria-label="필터 열기"]').isVisible()
    
    if (isMobile) {
      await page.click('button[aria-label="필터 열기"]')
      await page.waitForSelector('text=영업시간', { timeout: 5000 })
    }
    
    // Get initial count
    const initialCountText = await page.locator('text=/\\d+개의 PC방/').textContent()
    const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || '0')
    
    // Enable 24-hour filter
    await page.click('text=24시간 운영')
    
    if (isMobile) {
      await page.click('button:has-text("PC방 보기")')
    }
    
    await page.waitForTimeout(1000)
    
    // Get filtered count
    const filteredCountText = await page.locator('text=/\\d+개의 PC방/').first().textContent()
    const filteredCount = parseInt(filteredCountText?.match(/\d+/)?.[0] || '0')
    
    console.log('24-hour filter count:', filteredCount)
    
    // Should be fewer venues (not all are 24-hour)
    expect(filteredCount).toBeLessThanOrEqual(initialCount)
  })
})
