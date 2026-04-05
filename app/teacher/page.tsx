export const runtime = 'edge'

import { auth } from '@/auth'
import { query, queryOne } from '@/lib/db'
import { parseJsonArray } from '@/lib/utils'
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
    student_ids: parseJsonArray(a.student_ids),
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

  // Fetch dashboard data + unsubmitted alerts in parallel
  const now = new Date()
  const cutoff = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()

  const [data, urgentAssignmentsRaw, allSubmissions] = await Promise.all([
    getDashboardData(),
    query<{ id: string; title: string; due_date: string; student_ids: string }>(
      `SELECT id, title, due_date, student_ids FROM assignments WHERE due_date >= ? AND due_date <= ? ORDER BY due_date ASC`,
      [now.toISOString(), cutoff]
    ),
    query<{ assignment_id: string; student_id: string }>(
      `SELECT assignment_id, student_id FROM submissions WHERE assignment_id IN (SELECT id FROM assignments WHERE due_date >= ? AND due_date <= ?)`,
      [now.toISOString(), cutoff]
    ),
  ])

  const today = new Date()
  const dueTodayAssignments = data.recentAssignments.filter(
    (a) => {
      const due = new Date(a.due_date)
      return due.toDateString() === today.toDateString()
    }
  )

  // Build unsubmitted alerts
  const submittedSet = new Set(allSubmissions.map(s => `${s.assignment_id}:${s.student_id}`))

  // Get student names for unsubmitted
  const allStudentIds = [...new Set(urgentAssignmentsRaw.flatMap(a => parseJsonArray(a.student_ids)))]
  const studentNames = allStudentIds.length > 0
    ? await query<{ id: string; name: string }>(`SELECT id, name FROM users WHERE id IN (${allStudentIds.map(() => '?').join(',')})`, allStudentIds)
    : []
  const nameMap = new Map(studentNames.map(s => [s.id, s.name]))

  const unsubmittedAlerts = urgentAssignmentsRaw.map(a => {
    const enrolled = parseJsonArray(a.student_ids)
    const missing = enrolled.filter(id => !submittedSet.has(`${a.id}:${id}`)).map(id => nameMap.get(id) ?? '?')
    const hoursLeft = Math.round((new Date(a.due_date).getTime() - now.getTime()) / 3600000)
    return { id: a.id, title: a.title, missing, hoursLeft }
  }).filter(a => a.missing.length > 0)

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

        {/* 미제출 알림 */}
        {unsubmittedAlerts.length > 0 && (
          <div className="rounded-2xl border overflow-hidden" style={{ background: 'white', borderColor: 'var(--lemma-red)', borderLeftWidth: '4px' }}>
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--lemma-cream-2)' }}>
              <span style={{ color: 'var(--lemma-red)' }}>⚠</span>
              <h2 className="text-sm font-bold" style={{ color: 'var(--lemma-red)' }}>마감 임박 — 미제출 학생</h2>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--lemma-cream-2)' }}>
              {unsubmittedAlerts.map(alert => (
                <div key={alert.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/teacher/assignments/${alert.id}`}
                        className="text-sm font-semibold hover:underline" style={{ color: 'var(--lemma-ink)' }}>
                        {alert.title}
                      </Link>
                      <p className="text-xs mt-0.5" style={{ color: alert.hoursLeft <= 12 ? 'var(--lemma-red)' : 'oklch(45% 0.12 75)' }}>
                        {alert.hoursLeft <= 0 ? '마감됨' : `${alert.hoursLeft}시간 후 마감`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {alert.missing.map(name => (
                        <span key={name} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{ background: 'oklch(95% 0.06 25)', color: 'var(--lemma-red)' }}>
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
