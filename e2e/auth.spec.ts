import { test, expect } from '@playwright/test'

test.describe('인증', () => {
  test('로그인 페이지가 표시된다', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('text=Lemma')).toBeVisible()
    await expect(page.locator('text=PIN 번호')).toBeVisible()
  })

  test('숫자 버튼 클릭으로 PIN 입력 가능', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="text"]', 'admin')
    for (const d of ['1','1','4','1']) {
      await page.click(`button:text-is("${d}")`)
    }
    await expect(page.locator('div').filter({ hasText: /^●$/ }).first()).toBeVisible()
  })

  test('키보드로 PIN 입력 가능', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="text"]', 'admin')
    await page.keyboard.press('Enter')
    await page.keyboard.press('1')
    await page.keyboard.press('1')
    await page.keyboard.press('4')
    await page.keyboard.press('1')
    await expect(page.locator('div').filter({ hasText: /^●$/ }).first()).toBeVisible()
  })

  test('admin 로그인 성공 → 선생님 대시보드', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="text"]', 'admin')
    for (const d of ['1','1','4','1']) {
      await page.click(`button:text-is("${d}")`)
    }
    await page.click('button:has-text("로그인")')
    await expect(page).toHaveURL(/\/teacher/, { timeout: 10000 })
  })

  test('학생 로그인 성공 → 학생 홈', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="text"]', '이루다')
    for (const d of ['1','2','0','7']) {
      await page.click(`button:text-is("${d}")`)
    }
    await page.click('button:has-text("로그인")')
    await expect(page).toHaveURL(/\/student/, { timeout: 10000 })
  })

  test('잘못된 PIN → 에러 메시지', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="text"]', 'admin')
    for (const d of ['0','0','0','0']) {
      await page.click(`button:text-is("${d}")`)
    }
    await page.click('button:has-text("로그인")')
    await expect(page.locator('text=올바르지 않아요')).toBeVisible({ timeout: 5000 })
  })

  test('⌫ 버튼으로 PIN 삭제', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="text"]', 'admin')
    await page.click('button:text-is("1")')
    await page.click('button:text-is("2")')
    await page.click('button:has-text("⌫")')
    // PIN이 1개만 남은 상태에서 로그인 시도
    await page.click('button:has-text("로그인")')
    await expect(page.locator('text=PIN 4자리를 입력해주세요')).toBeVisible({ timeout: 3000 })
  })
})
