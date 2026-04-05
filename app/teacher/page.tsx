export const runtime = 'edge'

import { auth } from '@/auth'
import { query, queryOne } from '@/lib/db'
import Link from 'next/link'

async function getDashboardData() {
  const [
    studentCountRow,
    recentAssignmentsRaw,
    recentSubmissions,
  ] = await Promise.all([
    queryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM users WHERE role = 'student'`),
    query<{ id: string; title: string; due_date: string; student_ids: string }>(
      `SELECT id, title, due_date, student_ids FROM assignments ORDER BY created_at DESC LIMIT 5`
    ),
    query<{ id: string; assignment_id: string; student_id: string; status: string; total_score: number | null; submitted_at: string }>(
      `SELECT id, assignment_id, student_id, status, total_score, submitted_at FROM submissions ORDER BY submitted_at DESC LIMIT 20`
    ),
  ])

  const recentAssignments = recentAssignmentsRaw.map((a) => ({
    ...a,
    student_ids: JSON.parse(a.student_ids ?? '[]') as string[],
  }))

  // Submissions today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const submittedToday = recentSubmissions.filter(
    (s) => new Date(s.submitted_at) >= today
  ).length

  // Average score from done submissions
  const doneSubmissions = recentSubmissions.filter((s) => s.status === 'done' && s.total_score != null)
  const avgScore = doneSubmissions.length > 0
    ? Math.round(doneSubmissions.reduce((acc, s) => acc + (s.total_score ?? 0), 0) / doneSubmissions.length)
    : 0

  return {
    totalStudents: studentCountRow?.cnt ?? 0,
    submittedToday,
    avgScore,
    recentAssignments,
    recentSubmissions,
  }
}

export default async function TeacherDashboardPage() {
  const session = await auth()
  const data = await getDashboardData()

  const today = new Date()
  const dueTodayAssignments = data.recentAssignments.filter(
    (a) => {
      const due = new Date(a.due_date)
      return due.toDateString() === today.toDateString()
    }
  )

  return (
    <div>
      {/* Header */}
      <div className="px-7 py-5 border-b flex justify-between items-center" style={{ borderColor: 'var(--lemma-cream-2)' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--lemma-ink)' }}>대시보드</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--lemma-ink-3)' }}>
            {today.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            {' · '}학생 {data.totalStudents}명
          </p>
        </div>
        <Link
          href="/teacher/assignments/new"
          className="text-sm font-semibold px-4 py-2 rounded-xl transition-all"
          style={{ background: 'var(--lemma-gold)', color: 'var(--lemma-ink)' }}
        >
          + 숙제 출제
        </Link>
      </div>

      <div className="p-7 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: '오늘 제출',    value: data.submittedToday, unit: '건',  color: 'var(--lemma-ink)' },
            { label: '오늘 마감',    value: dueTodayAssignments.length, unit: '개', color: 'var(--lemma-gold-d)' },
            { label: '최근 평균 점수', value: data.avgScore, unit: '점',  color: 'var(--lemma-green)' },
          ].map(({ label, value, unit, color }) => (
            <div
              key={label}
              className="rounded-2xl p-5 border text-center"
              style={{ background: 'white', borderColor: 'var(--lemma-cream-2)' }}
            >
              <p className="text-4xl font-bold" style={{ color }}>
                {value}
                <span className="text-xl ml-1" style={{ color: 'var(--lemma-ink-3)' }}>{unit}</span>
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--lemma-ink-3)' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Recent assignments */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'white', borderColor: 'var(--lemma-cream-2)' }}>
          <div className="px-5 py-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--lemma-cream-2)' }}>
            <h2 className="text-sm font-bold" style={{ color: 'var(--lemma-ink)' }}>최근 숙제</h2>
            <Link href="/teacher/assignments" className="text-xs" style={{ color: 'var(--lemma-ink-3)' }}>
              전체 보기 →
            </Link>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--lemma-cream-2)' }}>
                {['숙제명', '마감일', '대상', '제출 현황'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--lemma-ink-3)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recentAssignments.map((a) => {
                const submitted = data.recentSubmissions.filter((s) => s.assignment_id === a.id).length
                const total = a.student_ids.length
                return (
                  <tr
                    key={a.id}
                    className="transition-colors hover:bg-stone-50"
                    style={{ borderBottom: '1px solid oklch(95% 0.005 90)' }}
                  >
                    <td className="px-5 py-3 text-sm font-semibold" style={{ color: 'var(--lemma-ink)' }}>
                      <Link href={`/teacher/assignments/${a.id}`} className="hover:underline">
                        {a.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--lemma-ink-2)' }}>
                      {new Date(a.due_date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--lemma-ink-2)' }}>
                      {total}명
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--lemma-cream-2)', maxWidth: '80px' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${total > 0 ? (submitted / total) * 100 : 0}%`,
                              background: 'var(--lemma-gold)',
                            }}
                          />
                        </div>
                        <span className="text-xs" style={{ color: 'var(--lemma-ink-3)' }}>
                          {submitted}/{total}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {data.recentAssignments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-sm" style={{ color: 'var(--lemma-ink-3)' }}>
                    아직 출제된 숙제가 없어요
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Recent submissions */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'white', borderColor: 'var(--lemma-cream-2)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--lemma-cream-2)' }}>
            <h2 className="text-sm font-bold" style={{ color: 'var(--lemma-ink)' }}>최근 제출</h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'oklch(95% 0.005 90)' }}>
            {data.recentSubmissions.slice(0, 8).map((s) => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ color: 'var(--lemma-ink-3)' }}>
                    {new Date(s.submitted_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{
                    background: s.status === 'done' ? 'oklch(93% 0.08 155)' : 'oklch(93% 0.04 75)',
                    color: s.status === 'done' ? 'oklch(35% 0.12 155)' : 'oklch(45% 0.12 75)',
                  }}
                >
                  {s.status === 'done' ? '채점완료' : s.status === 'processing' ? 'AI 채점중' : '대기중'}
                  {s.total_score != null && ` · ${s.total_score}점`}
                </span>
              </div>
            ))}
            {data.recentSubmissions.length === 0 && (
              <p className="px-5 py-10 text-center text-sm" style={{ color: 'var(--lemma-ink-3)' }}>
                아직 제출된 숙제가 없어요
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
