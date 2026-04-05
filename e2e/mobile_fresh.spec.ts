import { test, expect } from '@playwright/test'

test('mobile fresh visit - no cache', async ({ browser }) => {
  // 완전히 새 컨텍스트 (시크릿 모드와 동일)
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    viewport: { width: 390, height: 844 },
  })
  const page = await ctx.newPage()
  
  // 네트워크 요청 모니터링
  page.on('response', async (res) => {
    if (res.url().includes('lemma-15t.pages.dev/') && !res.url().includes('_next')) {
      console.log(`${res.status()} ${res.headers()['content-type'] ?? '?'} → ${res.url()}`)
    }
  })

  await page.goto('https://lemma-15t.pages.dev/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  console.log('Final URL:', page.url())
  await page.screenshot({ path: '/tmp/mobile_fresh.png', fullPage: true })
  
  await expect(page).toHaveURL(/login/)
  await ctx.close()
})
