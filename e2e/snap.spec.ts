import { test } from '@playwright/test'

test('student home screenshot', async ({ page }) => {
  await page.goto('https://lemma-15t.pages.dev/login')
  await page.fill('input[placeholder="홍길동"]', '이루다')
  await page.click('button:has-text("1")')
  await page.click('button:has-text("2")')
  await page.click('button:has-text("0")')
  await page.click('button:has-text("7")')
  await page.click('button:has-text("로그인")')
  await page.waitForURL('**/student', { timeout: 10000 })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: '/tmp/student_home.png', fullPage: true })
})
