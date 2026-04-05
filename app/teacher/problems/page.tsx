export const runtime = 'edge'

import { auth } from '@/auth'
import { query } from '@/lib/db'
import Link from 'next/link'

export default async function ProblemsPage() {
  await auth()
  const problemsRaw = await query<{ id: string; title: string; answer: string; concept_tags: string; created_at: string }>(
    `SELECT id, title, answer, concept_tags, created_at FROM problems ORDER BY created_at DESC`
  )
  const problems = problemsRaw.map(p => ({
    ...p,
    concept_tags: JSON.parse(p.concept_tags ?? '[]') as string[],
  }))

  return (
    <div>
      <div className="px-7 py-5 border-b flex justify-between items-center" style={{ borderColor: 'var(--lemma-cream-2)' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--lemma-ink)' }}>문제 관리</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--lemma-ink-3)' }}>총 {problems?.length ?? 0}개</p>
        </div>
        <Link href="/teacher/problems/new"
          className="text-sm font-semibold px-4 py-2 rounded-xl"
          style={{ background: 'var(--lemma-gold)', color: 'var(--lemma-ink)' }}>
          + 문제 등록
        </Link>
      </div>

      <div className="p-7">
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'white', borderColor: 'var(--lemma-cream-2)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--lemma-cream-2)' }}>
                {['제목', '개념 태그', '정답', '등록일'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--lemma-ink-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {problems?.map((p) => (
                <tr key={p.id} className="hover:bg-stone-50" style={{ borderBottom: '1px solid oklch(95% 0.005 90)' }}>
                  <td className="px-5 py-3 text-sm font-semibold" style={{ color: 'var(--lemma-ink)' }}>{p.title}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {p.concept_tags?.map((tag: string) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--lemma-cream-2)', color: 'var(--lemma-ink-2)' }}>{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--lemma-ink-2)' }}>{p.answer}</td>
                  <td className="px-5 py-3 text-xs" style={{ color: 'var(--lemma-ink-3)' }}>
                    {new Date(p.created_at).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
              {(!problems || problems.length === 0) && (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-sm" style={{ color: 'var(--lemma-ink-3)' }}>
                  아직 등록된 문제가 없어요
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
