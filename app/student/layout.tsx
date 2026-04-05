export const runtime = 'edge'

import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import BottomNav from './BottomNav'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  // student role 또는 admin(선생님이 학생 뷰 보는 중)만 허용
  if (session.user.role !== 'student' && session.user.role !== 'admin') redirect('/login')

  const isAdmin = session.user.role === 'admin'

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto" style={{ background: 'var(--lemma-cream)' }}>
      {/* 선생님이 학생 뷰 보는 중 배너 */}
      {isAdmin && (
        <div
          className="flex items-center justify-between px-4 py-2 text-xs font-semibold"
          style={{ background: 'var(--lemma-gold)', color: 'var(--lemma-ink)' }}
        >
          <span>👁 학생 뷰 미리보기 중</span>
          <Link href="/teacher" className="underline">선생님 페이지로 →</Link>
        </div>
      )}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
