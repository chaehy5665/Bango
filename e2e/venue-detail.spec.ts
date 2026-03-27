import { expect, test } from '@playwright/test'

test.describe('Venue Detail', () => {
  test('상세 페이지 렌더링 및 주요 섹션 표시', async ({ page }) => {
    await page.route('**/venues/11111111-1111-1111-1111-111111111111', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: `
          <!doctype html>
          <html lang="ko">
            <body>
              <h1>레전드 PC방 강남역점</h1>
              <section><h2>가격</h2></section>
              <section><h2>사양</h2></section>
              <section><h2>주변기기</h2></section>
              <section><h2>메뉴</h2></section>
            </body>
          </html>
        `,
      })
    })

    await page.goto('/venues/11111111-1111-1111-1111-111111111111')

    await expect(page).toHaveURL(/\/venues\/11111111-1111-1111-1111-111111111111/)
    await expect(page.getByRole('heading', { name: '레전드 PC방 강남역점' })).toBeVisible()
    await expect(page.getByText('가격')).toBeVisible()
    await expect(page.getByText('사양')).toBeVisible()
    await expect(page.getByText('주변기기')).toBeVisible()
    await expect(page.getByText('메뉴')).toBeVisible()
  })
})
