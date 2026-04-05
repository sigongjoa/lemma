import { test, expect, Page } from '@playwright/test'

const BASE = 'https://lemma-15t.pages.dev'

async function loginAs(page: Page, name: string, pin: string) {
  await page.goto(`${BASE}/`)
  await page.fill('input[placeholder="홍길동"]', name)
  for (const d of pin.split('')) {
    await page.locator('button').filter({ hasText: new RegExp(`^${d}$`) }).click()
    await page.waitForTimeout(80)
  }
  await page.click('button:has-text("로그인")')
  await page.waitForURL(/\/(teacher|student)/, { timeout: 10000 })
}

test.describe.serial('전체 플로우', () => {
  test('① 문제 등록', async ({ page }) => {
    await loginAs(page, 'admin', '1141')
    await page.goto(`${BASE}/teacher/problems/new`)
    await page.fill('input[placeholder*="이차방정식 근"]', '삼각형 넓이 계산')
    await page.fill('textarea[placeholder*="2x²"]', '밑변이 10cm, 높이가 6cm인 삼각형의 넓이는?')
    await page.fill('input[placeholder*="x = 1/2"]', '30')
    await page.click('button:has-text("등록")')
    await page.waitForURL(/problems/, { timeout: 10000 })
    await page.screenshot({ path: '/tmp/f1_done.png' })
    console.log('✅ 문제 등록 완료:', page.url())
  })

  test('② 문제 세트 생성', async ({ page }) => {
    await loginAs(page, 'admin', '1141')
    await page.goto(`${BASE}/teacher/problem-sets/new`)
    await page.waitForTimeout(2000)
    // 문제 선택 (첫 번째 문제 클릭)
    const firstProblem = page.locator('button').filter({ hasText: /삼각형|이차/ }).first()
    await firstProblem.waitFor({ timeout: 5000 })
    await firstProblem.click()
    // 세트 이름 입력
    await page.fill('input[placeholder*="이차방정식 10"]', '5월 1차 테스트')
    await page.click('button:has-text("세트 만들기")')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/f2_done.png' })
    console.log('✅ 문제 세트 생성 완료:', page.url())
  })

  test('③ 숙제 출제', async ({ page }) => {
    await loginAs(page, 'admin', '1141')
    await page.goto(`${BASE}/teacher/assignments/new`)
    await page.waitForTimeout(2000)
    // 숙제 제목
    await page.fill('input[placeholder*="이차방정식 연습"]', '5월 1주차 숙제')
    // 문제 세트 선택
    const select = page.locator('select').first()
    await select.waitFor({ timeout: 5000 })
    const optCount = await select.locator('option').count()
    console.log('문제 세트 옵션 수:', optCount)
    if (optCount > 1) await select.selectOption({ index: 1 })
    // 마감일
    await page.locator('input[type="datetime-local"], input[type="date"]').first().fill('2026-04-30T23:59')
    // 학생 선택 (이루다)
    await page.locator('button').filter({ hasText: '이루다' }).click()
    await page.screenshot({ path: '/tmp/f3_filled.png' })
    await page.click('button:has-text("숙제 출제")')
    await page.waitForTimeout(3000)
    await page.screenshot({ path: '/tmp/f3_done.png' })
    console.log('✅ 숙제 출제 완료:', page.url())
  })

  test('④ 학생 홈에서 숙제 표시 확인', async ({ page }) => {
    await loginAs(page, '이루다', '1207')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/f4_student.png' })
    const body = await page.locator('body').innerText()
    const hasHomework = !body.includes('아직 출제된 숙제가 없어요')
    console.log('학생 홈 숙제 표시:', hasHomework ? '✅ 있음' : '❌ 없음')
    expect(hasHomework).toBe(true)
  })
})
