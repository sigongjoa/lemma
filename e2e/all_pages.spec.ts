import { test, expect } from '@playwright/test'

async function loginAsStudent(page: any) {
  await page.goto('https://lemma-15t.pages.dev/')
  await page.fill('input[placeholder="홍길동"]', '이루다')
  for (const d of ['1','2','0','7']) {
    await page.locator('button').filter({ hasText: new RegExp(`^${d}$`) }).click()
    await page.waitForTimeout(80)
  }
  await page.click('button:has-text("로그인")')
  await page.waitForURL('**/student**', { timeout: 15000 })
}

const pages = [
  '/student',
  '/student/history', 
  '/student/wrong',
  '/student/profile',
]

for (const p of pages) {
  test(`live page: ${p}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await loginAsStudent(page)
    await page.goto(`https://lemma-15t.pages.dev${p}`, { waitUntil: 'networkidle' })
    const status_text = await page.locator('body').innerText().catch(() => '')
    const hasError = status_text.includes('Application error') || status_text.includes('server-side exception')
    console.log(`${p}: error=${hasError}`, errors.length ? errors : '')
    await page.screenshot({ path: `/tmp/page_${p.replace(/\//g, '_')}.png` })
    expect(hasError).toBe(false)
  })
}
