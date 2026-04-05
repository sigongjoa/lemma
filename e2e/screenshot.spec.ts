import { test } from '@playwright/test'

test('사이트 스크린샷', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: '/tmp/root.png', fullPage: true })

  await page.goto('/login')
  await page.waitForTimeout(2000)
  await page.screenshot({ path: '/tmp/login.png', fullPage: true })

  // 로그인
  await page.fill('input[type="text"]', 'admin')
  for (const d of ['1','1','4','1']) await page.click(`button:text-is("${d}")`)
  await page.click('button:has-text("로그인")')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: '/tmp/teacher.png', fullPage: true })

  await page.goto('/login')
  await page.fill('input[type="text"]', '이루다')
  for (const d of ['1','2','0','7']) await page.click(`button:text-is("${d}")`)
  await page.click('button:has-text("로그인")')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: '/tmp/student.png', fullPage: true })
})
