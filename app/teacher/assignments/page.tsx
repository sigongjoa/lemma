export const runtime = 'edge'

import { auth } from '@/auth'
import { query } from '@/lib/db'
import Link from 'next/link'

export default async function AssignmentsPage() {
  await auth()
  const [assignmentsRaw, submissions] = await Promise.all([
    query<{ id: string; title: string; due_date: string; student_ids: string; problem_set_name: string | null; created_at: string }>(
      `SELECT a.id, a.title, a.due_date, a.student_ids, a.created_at, ps.name as problem_set_name
       FROM assignments a
       LEFT JOIN problem_sets ps ON ps.id = a.problem_set_id
       ORDER BY a.created_at DESC`
    ),
    query<{ assignment_id: string; status: string }>(
      `SELECT assignment_id, status FROM submissions`
    ),
  ])

  const assignments = assignmentsRaw.map(a => ({
    ...a,
    student_ids: JSON.parse(a.student_ids ?? '[]') as string[],
    problem_set: a.problem_set_name ? { name: a.problem_set_name } : null,
  }))

  return (
    <div>
      <div className="px-7 py-5 border-b flex justify-between items-center" style={{ borderColor: 'var(--lemma-cream-2)' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--lemma-ink)' }}>숙제 관리</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--lemma-ink-3)' }}>총 {assignments?.length ?? 0}개</p>
        </div>
        <Link href="/teacher/assignments/new"
          className="text-sm font-semibold px-4 py-2 rounded-xl"
          style={{ background: 'var(--lemma-gold)', color: 'var(--lemma-ink)' }}>
          + 숙제 출제
        </Link>
      </div>

      <div className="p-7">
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'white', borderColor: 'var(--lemma-cream-2)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--lemma-cream-2)' }}>
                {['숙제명', '문제 세트', '마감일', '제출현황'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--lemma-ink-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assignments?.map((a) => {
                const submitted = submissions?.filter((s) => s.assignment_id === a.id).length ?? 0
                const total = a.student_ids.length
                const isOverdue = new Date(a.due_date) < new Date()
                return (
                  <tr key={a.id} className="hover:bg-stone-50" style={{ borderBottom: '1px solid oklch(95% 0.005 90)' }}>
                    <td className="px-5 py-3 text-sm font-semibold" style={{ color: 'var(--lemma-ink)' }}>
                      <Link href={`/teacher/assignments/${a.id}`} className="hover:underline">{a.title}</Link>
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--lemma-ink-2)' }}>{a.problem_set?.name}</td>
                    <td className="px-5 py-3 text-sm" style={{ color: isOverdue ? 'var(--lemma-red)' : 'var(--lemma-ink-2)' }}>
                      {new Date(a.due_date).toLocaleDateString('ko-KR')}
                      {isOverdue && ' (마감)'}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 rounded-full" style={{ width: '60px', background: 'var(--lemma-cream-2)' }}>
                          <div className="h-full rounded-full" style={{ width: `${total > 0 ? (submitted/total)*100 : 0}%`, background: 'var(--lemma-gold)' }} />
                        </div>
                        <span className="text-xs" style={{ color: 'var(--lemma-ink-3)' }}>{submitted}/{total}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {(!assignments || assignments.length === 0) && (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-sm" style={{ color: 'var(--lemma-ink-3)' }}>
                  아직 출제된 숙제가 없어요
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
