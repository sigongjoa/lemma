import { test, expect, Page } from '@playwright/test'

async function loginAsStudent(page: Page) {
  await page.goto('/login')
  await page.fill('input[type="text"]', '이루다')
  for (const d of ['1','2','0','7']) {
    await page.click(`button:text-is("${d}")`)
  }
  await page.click('button:has-text("로그인")')
  await expect(page).toHaveURL(/\/student/, { timeout: 10000 })
}

test.describe('학생 앱', () => {
  test('학생 홈 렌더링', async ({ page }) => {
    await loginAsStudent(page)
    await expect(page.locator('text=이루다')).toBeVisible()
    await expect(page.locator('text=미제출')).toBeVisible()
    await expect(page.locator('text=숙제 목록')).toBeVisible()
  })

  test('바텀 네비 4개 탭 표시', async ({ page }) => {
    await loginAsStudent(page)
    const nav = page.locator('nav').last()
    await expect(nav.locator('text=숙제')).toBeVisible()
    await expect(nav.locator('text=성적')).toBeVisible()
    await expect(nav.locator('text=오답노트')).toBeVisible()
    await expect(nav.locator('text=내 정보')).toBeVisible()
  })

  test('성적 탭 이동', async ({ page }) => {
    await loginAsStudent(page)
    await page.click('a[href="/student/history"]')
    await expect(page).toHaveURL(/\/student\/history/)
    await expect(page.locator('text=성적 이력')).toBeVisible()
  })

  test('오답노트 탭 이동', async ({ page }) => {
    await loginAsStudent(page)
    await page.click('a[href="/student/wrong"]')
    await expect(page).toHaveURL(/\/student\/wrong/)
    await expect(page.locator('h2')).toBeVisible()
  })

  test('내 정보 탭 이동', async ({ page }) => {
    await loginAsStudent(page)
    await page.click('a[href="/student/profile"]')
    await expect(page).toHaveURL(/\/student\/profile/)
    await expect(page.locator('text=이루다')).toBeVisible()
    await expect(page.locator('text=로그아웃')).toBeVisible()
  })

  test('선생님 페이지 접근 차단', async ({ page }) => {
    await loginAsStudent(page)
    await page.goto('/teacher')
    await expect(page).toHaveURL(/\/student/, { timeout: 5000 })
  })

  test('숙제 없으면 빈 상태 메시지', async ({ page }) => {
    await loginAsStudent(page)
    const empty = page.locator('text=아직 출제된 숙제가 없어요')
    const cards = page.locator('.rounded-2xl.border')
    await expect(empty.or(cards.first())).toBeVisible({ timeout: 5000 })
  })
})
