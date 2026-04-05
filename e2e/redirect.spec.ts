import { test, expect } from '@playwright/test'

test('/ redirects to /login', async ({ page }) => {
  const res = await page.goto('https://lemma-15t.pages.dev/')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: '/tmp/redirect_test.png' })
  console.log('Final URL:', page.url())
  console.log('Status:', res?.status())
  await expect(page).toHaveURL(/login/)
})
