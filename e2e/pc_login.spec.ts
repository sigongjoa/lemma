import { test } from '@playwright/test'

test('PC login page', async ({ page }) => {
  await page.goto('https://lemma-15t.pages.dev/login', { waitUntil: 'networkidle' })
  await page.screenshot({ path: '/tmp/pc_login.png', fullPage: true })
})
