export const runtime = 'edge'

import { redirect } from 'next/navigation'

// 무조건 /login으로 보냄 — 미들웨어가 세션 있으면 역할별 페이지로 보냄
export default function RootPage() {
  redirect('/login')
}
