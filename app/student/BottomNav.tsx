'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/student', icon: '📋', label: '숙제' },
  { href: '/student/history', icon: '📈', label: '성적' },
  { href: '/student/wrong', icon: '📝', label: '오답노트' },
  { href: '/student/profile', icon: '👤', label: '내 정보' },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md flex border-t"
      style={{ background: 'white', borderColor: 'var(--lemma-cream-2)' }}
    >
      {items.map(({ href, icon, label }) => {
        const active = pathname === href || (href !== '/student' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors"
            style={{
              color: active ? 'var(--lemma-ink)' : 'var(--lemma-ink-3)',
              fontWeight: active ? 600 : 400,
            }}
          >
            <span className="text-lg">{icon}</span>
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
