import { test, expect, Page } from '@playwright/test'

async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.fill('input[type="text"]', 'admin')
  for (const d of ['1','1','4','1']) {
    await page.click(`button:text-is("${d}")`)
  }
  await page.click('button:has-text("로그인")')
  await expect(page).toHaveURL(/\/teacher/, { timeout: 10000 })
}

test.describe('선생님 대시보드', () => {
  test('대시보드 렌더링', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page.locator('h1:has-text("대시보드")')).toBeVisible()
    await expect(page.locator('text=오늘 제출')).toBeVisible()
    await expect(page.locator('text=최근 평균 점수')).toBeVisible()
  })

  test('사이드바 네비게이션 작동', async ({ page }) => {
    await loginAsAdmin(page)
    await page.click('text=학생 목록')
    await expect(page).toHaveURL(/\/teacher\/students/)
    await expect(page.locator('h1:has-text("학생 목록")')).toBeVisible()
  })

  test('학생 목록 표시', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/teacher/students')
    await expect(page.locator('text=이루다')).toBeVisible()
  })

  test('문제 관리 페이지 접근', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/teacher/problems')
    await expect(page.locator('h1:has-text("문제 관리")')).toBeVisible()
    await expect(page.locator('text=+ 문제 등록')).toBeVisible()
  })

  test('문제 등록 폼', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/teacher/problems/new')
    await expect(page.getByRole('heading', { name: '문제 등록' })).toBeVisible()
    await expect(page.locator('input[placeholder*="이차방정식"]')).toBeVisible()
  })

  test('숙제 관리 페이지 접근', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/teacher/assignments')
    await expect(page.locator('h1:has-text("숙제 관리")')).toBeVisible()
  })

  test('학생 접근 시 리다이렉트', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="text"]', '이루다')
    for (const d of ['1','2','0','7']) {
      await page.click(`button:text-is("${d}")`)
    }
    await page.click('button:has-text("로그인")')
    await expect(page).toHaveURL(/\/student/, { timeout: 10000 })
    await page.goto('/teacher')
    await expect(page).toHaveURL(/\/student/, { timeout: 5000 })
  })
})
