import { test } from '@playwright/test'

test('렌더링 디버그', async ({ page }) => {
  const errors: string[] = []
  const failed: string[] = []
  
  page.on('pageerror', e => errors.push(e.message))
  page.on('requestfailed', r => failed.push(`${r.url()} - ${r.failure()?.errorText}`))

  await page.goto('https://lemma-15t.pages.dev/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  
  // 실제 화면에 보이는 텍스트
  const visible = await page.evaluate(() => {
    const els = document.querySelectorAll('*')
    const texts: string[] = []
    els.forEach(el => {
      if (el.children.length === 0 && el.textContent?.trim()) {
        const style = window.getComputedStyle(el)
        if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
          texts.push(el.textContent.trim())
        }
      }
    })
    return texts.slice(0, 20)
  })
  
  console.log('보이는 텍스트:', visible)
  console.log('JS 에러:', errors)
  console.log('실패한 요청:', failed)
  
  // CSS 변수 적용 확인
  const inkColor = await page.evaluate(() => 
    getComputedStyle(document.documentElement).getPropertyValue('--lemma-ink').trim()
  )
  console.log('--lemma-ink 값:', inkColor || '없음 (CSS 변수 미적용!)')
  
  await page.screenshot({ path: '/tmp/debug_render.png', fullPage: true })
})
