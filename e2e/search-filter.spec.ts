import { expect, test } from '@playwright/test'

test.describe('Search and Filter', () => {
  test('검색어 입력 후 결과 선택 이동', async ({ page }) => {
    await page.route('**/rest/v1/venues**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '11111111-1111-1111-1111-111111111111',
            name: '홍대 게이밍존 PC방',
            address_full: '서울특별시 마포구 와우산로 94',
            address_district: '마포구',
          },
        ]),
      })
    })

    await page.goto('/search')

    await page.getByPlaceholder('PC방 이름 또는 주소 검색...').fill('홍대 게이밍존 PC방')
    await expect(page.getByRole('button', { name: /홍대 게이밍존 PC방/ })).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: /홍대 게이밍존 PC방/ }).click()
    await expect(page).toHaveURL(/\/venues\//)
  })

  test('필터 토글 적용 시 결과 수 변경', async ({ page }) => {
    await page.goto('/map')

    const mobileFilterOpen = page.getByRole('button', { name: '필터 열기' })
    if (await mobileFilterOpen.isVisible()) {
      await mobileFilterOpen.click()
    }

    const gpuButton = page.getByRole('button', { name: 'RTX 4060+' })
    const open24Button = page.getByRole('button', { name: '24시간 운영' })

    await gpuButton.click()
    await open24Button.click()

    await expect(gpuButton).toHaveClass(/bg-indigo-600/)
    await expect(open24Button).toHaveClass(/bg-indigo-50/)

    if (await mobileFilterOpen.isVisible()) {
      await page.getByRole('button', { name: /\d+개 PC방 보기/ }).click()
    }
  })
})
