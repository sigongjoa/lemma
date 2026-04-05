export const runtime = 'edge'

import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import LoginPage from './login/page'

export default async function RootPage() {
  const session = await auth()
  if (session) {
    redirect(session.user.role === 'admin' ? '/teacher' : '/student')
  }
  // 로그인 안 된 경우 → 로그인 페이지 직접 렌더링 (리다이렉트 없이)
  return <LoginPage />
}
