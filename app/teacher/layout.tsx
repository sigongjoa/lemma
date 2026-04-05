export const runtime = 'edge'

import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signOut } from '@/auth'

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') redirect('/login')

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--lemma-cream)' }}>
      {/* Sidebar */}
      <aside
        className="w-56 flex-shrink-0 border-r flex flex-col"
        style={{ background: 'oklch(96% 0.008 90)', borderColor: 'var(--lemma-cream-2)' }}
      >
        {/* Logo */}
        <div className="px-5 py-6 border-b" style={{ borderColor: 'var(--lemma-cream-2)' }}>
          <span className="font-brand text-xl" style={{ color: 'var(--lemma-ink)' }}>
            Lemma{' '}
            <span className="font-brand-italic" style={{ color: 'var(--lemma-gold)' }}>λ</span>
          </span>
        </div>

        <nav className="flex-1 py-4">
          <p className="px-5 py-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--lemma-ink-3)' }}>
            메뉴
          </p>
          {[
            { href: '/teacher',                    icon: '📊', label: '대시보드' },
            { href: '/teacher/assignments',         icon: '📋', label: '숙제 관리' },
            { href: '/teacher/problems',            icon: '📝', label: '문제 관리' },
            { href: '/teacher/problem-sets/new',    icon: '📦', label: '문제 세트' },
            { href: '/teacher/students',            icon: '👥', label: '학생 목록' },
          ].map(({ href, icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-white/60"
              style={{ color: 'var(--lemma-ink-2)' }}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {/* Student view & Sign out */}
        <div className="p-4 border-t space-y-2" style={{ borderColor: 'var(--lemma-cream-2)' }}>
          <Link
            href="/student"
            className="flex items-center justify-center gap-2 w-full text-xs py-2 rounded-lg border transition-colors hover:bg-white/60"
            style={{ borderColor: 'var(--lemma-cream-2)', color: 'var(--lemma-ink-2)' }}
          >
            <span>👁</span>
            <span>학생 뷰 보기</span>
          </Link>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}
          >
            <button
              type="submit"
              className="w-full text-xs py-2 rounded-lg border transition-colors"
              style={{ borderColor: 'var(--lemma-cream-2)', color: 'var(--lemma-ink-3)' }}
            >
              로그아웃
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
