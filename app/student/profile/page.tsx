export const runtime = 'edge'

import { auth, signOut } from '@/auth'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const { name, email, role } = session.user
  const joined = (session.user as { createdAt?: string }).createdAt

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--lemma-cream)' }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-5 border-b" style={{ borderColor: 'var(--lemma-cream-2)', background: 'white' }}>
        <h1 className="text-xl font-bold" style={{ color: 'var(--lemma-ink)' }}>내 정보</h1>
      </div>

      <div className="px-5 py-6 space-y-4">
        {/* Profile card */}
        <div className="rounded-2xl p-5 border space-y-4" style={{ background: 'white', borderColor: 'var(--lemma-cream-2)' }}>
          {/* Avatar placeholder */}
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: 'var(--lemma-cream-2)' }}
            >
              👤
            </div>
            <div>
              <p className="font-bold text-lg" style={{ color: 'var(--lemma-ink)' }}>{name}</p>
              {email && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--lemma-ink-3)' }}>{email}</p>
              )}
              <span
                className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'oklch(93% 0.06 75)', color: 'var(--lemma-gold-d)' }}
              >
                {role === 'student' ? '학생' : role}
              </span>
            </div>
          </div>

          {joined && (
            <div className="pt-3 border-t" style={{ borderColor: 'var(--lemma-cream-2)' }}>
              <p className="text-xs" style={{ color: 'var(--lemma-ink-3)' }}>
                가입일:{' '}
                {new Date(joined).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>

        {/* Logout */}
        <form
          action={async () => {
            'use server'
            await signOut({ redirectTo: '/login' })
          }}
        >
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-95"
            style={{ background: 'oklch(95% 0.06 25)', color: 'var(--lemma-red)', border: '1px solid oklch(85% 0.1 25)' }}
          >
            로그아웃
          </button>
        </form>
      </div>
    </div>
  )
}
