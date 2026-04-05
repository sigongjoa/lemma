import { test, expect } from '@playwright/test'

test('live: root URL', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  
  const res = await page.goto('https://lemma-15t.pages.dev/', { waitUntil: 'networkidle' })
  await page.screenshot({ path: '/tmp/live_root.png' })
  console.log('Status:', res?.status(), '| URL:', page.url())
  if (errors.length) console.log('JS errors:', errors)
  await expect(page.locator('button:has-text("로그인")')).toBeVisible({ timeout: 5000 })
})

test('live: login as student 이루다', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  await page.goto('https://lemma-15t.pages.dev/')
  await page.fill('input[placeholder="홍길동"]', '이루다')
  for (const d of ['1','2','0','7']) {
    await page.locator('button').filter({ hasText: new RegExp(`^${d}$`) }).click()
    await page.waitForTimeout(100)
  }
  await page.click('button:has-text("로그인")')
  await page.waitForURL('**/student**', { timeout: 15000 })
  await page.screenshot({ path: '/tmp/live_student.png' })
  console.log('Student URL:', page.url())
  if (errors.length) console.log('JS errors:', errors)
})

test('live: login as admin', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  await page.goto('https://lemma-15t.pages.dev/')
  await page.fill('input[placeholder="홍길동"]', 'admin')
  for (const d of ['1','1','4','1']) {
    await page.locator('button').filter({ hasText: new RegExp(`^${d}$`) }).click()
    await page.waitForTimeout(100)
  }
  await page.click('button:has-text("로그인")')
  await page.waitForURL('**/teacher**', { timeout: 15000 })
  await page.screenshot({ path: '/tmp/live_teacher.png' })
  console.log('Teacher URL:', page.url())
  if (errors.length) console.log('JS errors:', errors)

  // 학생 뷰 버튼 클릭
  await page.click('a:has-text("학생 뷰 보기")')
  await page.waitForURL('**/student**', { timeout: 10000 })
  await page.screenshot({ path: '/tmp/live_teacher_to_student.png' })
  console.log('After student view click:', page.url())
})
