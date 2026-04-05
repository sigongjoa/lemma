import { test, expect } from '@playwright/test'

test('entrypoint → login → student home', async ({ page }) => {
  // Step 1: root URL
  console.log('Step 1: visiting root URL')
  await page.goto('https://lemma-15t.pages.dev/')
  await page.waitForTimeout(2000)
  console.log('URL after root visit:', page.url())
  console.log('Content-Type?', await page.evaluate(() => document.contentType))
  await page.screenshot({ path: '/tmp/e2e_1_root.png' })

  // Step 2: should be on /login
  console.log('Step 2: check on login page')
  await expect(page).toHaveURL(/login/, { timeout: 10000 })
  await page.screenshot({ path: '/tmp/e2e_2_login.png' })

  // Step 3: fill name
  console.log('Step 3: fill name 이루다')
  await page.fill('input[placeholder="홍길동"]', '이루다')
  await page.screenshot({ path: '/tmp/e2e_3_name.png' })

  // Step 4: click PIN digits 1 2 0 7
  console.log('Step 4: click PIN 1207')
  for (const digit of ['1', '2', '0', '7']) {
    const btn = page.locator(`button`).filter({ hasText: new RegExp(`^${digit}$`) })
    console.log(`  clicking ${digit}`)
    await btn.click()
    await page.waitForTimeout(200)
  }
  await page.screenshot({ path: '/tmp/e2e_4_pin.png' })

  // Step 5: click 로그인
  console.log('Step 5: click 로그인')
  await page.click('button:has-text("로그인")')
  await page.waitForTimeout(3000)
  console.log('URL after login:', page.url())
  await page.screenshot({ path: '/tmp/e2e_5_after_login.png' })

  // Step 6: should be on /student
  await expect(page).toHaveURL(/student/, { timeout: 10000 })
  console.log('SUCCESS: reached student home')
  await page.screenshot({ path: '/tmp/e2e_6_student_home.png' })
})
