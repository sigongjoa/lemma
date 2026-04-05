export const runtime = 'edge'

import { auth } from '@/auth'
import { queryOne, query } from '@/lib/db'
import { parseJsonArray } from '@/lib/utils'
import { notFound } from 'next/navigation'
import Link from 'next/link'

async function getAssignmentDetail(id: string) {
  const assignment = await queryOne<{
    id: string; title: string; due_date: string; student_ids: string
    problem_set_id: string; problem_set_name: string | null
  }>(
    `SELECT a.id, a.title, a.due_date, a.student_ids, a.problem_set_id, ps.name as problem_set_name
     FROM assignments a LEFT JOIN problem_sets ps ON ps.id = a.problem_set_id
     WHERE a.id = ?`, [id]
  )
  if (!assignment) return null

  const studentIds = parseJsonArray(assignment.student_ids)

  const [students, submissions] = await Promise.all([
    studentIds.length > 0
      ? query<{ id: string; name: string }>(
          `SELECT id, name FROM users WHERE id IN (${studentIds.map(() => '?').join(',')})`,
          studentIds
        )
      : Promise.resolve([]),
    query<{ id: string; student_id: string; status: string; total_score: number | null; submitted_at: string }>(
      `SELECT id, student_id, status, total_score, submitted_at FROM submissions WHERE assignment_id = ?`, [id]
    ),
  ])

  const submissionMap = new Map(submissions.map(s => [s.student_id, s]))

  const roster = students.map(s => ({
    ...s,
    submission: submissionMap.get(s.id) ?? null,
  })).sort((a, b) => {
    // Unsubmitted first, then by score desc
    if (!a.submission && b.submission) return -1
    if (a.submission && !b.submission) return 1
    return (b.submission?.total_score ?? 0) - (a.submission?.total_score ?? 0)
  })

  const submitted = submissions.length
  const done = submissions.filter(s => s.status === 'done').length
  const avgScore = done > 0
    ? Math.round(submissions.filter(s => s.status === 'done' && s.total_score != null)
        .reduce((acc, s) => acc + (s.total_score ?? 0), 0) / done)
    : null

  return { assignment, roster, submitted, total: studentIds.length, avgScore }
}

export default async function AssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await auth()
  const { id } = await params
  const data = await getAssignmentDetail(id)
  if (!data) notFound()

  const { assignment, roster, submitted, total, avgScore } = data
  const isOverdue = new Date(assignment.due_date) < new Date()

  const statusBadge = (sub: { status: string; total_score: number | null } | null) => {
    if (!sub) return { label: '미제출', bg: 'var(--lemma-cream-2)', color: 'var(--lemma-ink-3)' }
    if (sub.status === 'pending' || sub.status === 'processing') return { label: 'AI 채점 중', bg: 'oklch(93% 0.04 75)', color: 'oklch(45% 0.12 75)' }
    if (sub.status === 'done') return { label: `${sub.total_score ?? 0}점`, bg: 'oklch(93% 0.08 155)', color: 'oklch(35% 0.12 155)' }
    return { label: '오류', bg: 'oklch(95% 0.06 25)', color: 'var(--lemma-red)' }
  }

  return (
    <div>
      <div className="px-7 py-5 border-b" style={{ borderColor: 'var(--lemma-cream-2)' }}>
        <div className="flex items-center gap-3 mb-3">
          <Link href="/teacher/assignments" className="text-sm px-3 py-1.5 rounded-lg border"
            style={{ borderColor: 'var(--lemma-cream-2)', color: 'var(--lemma-ink-2)' }}>← 목록</Link>
        </div>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--lemma-ink)' }}>{assignment.title}</h1>
            <p className="text-xs mt-1" style={{ color: isOverdue ? 'var(--lemma-red)' : 'var(--lemma-ink-3)' }}>
              {assignment.problem_set_name && `${assignment.problem_set_name} · `}
              마감 {new Date(assignment.due_date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
              {isOverdue && ' (마감됨)'}
            </p>
          </div>
          <div className="flex gap-3">
            {[
              { label: '제출', value: `${submitted}/${total}`, color: 'var(--lemma-ink)' },
              { label: '평균', value: avgScore != null ? `${avgScore}점` : '—', color: 'var(--lemma-gold-d)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center px-4 py-2 rounded-xl border"
                style={{ background: 'white', borderColor: 'var(--lemma-cream-2)' }}>
                <p className="text-xl font-bold" style={{ color }}>{value}</p>
                <p className="text-xs" style={{ color: 'var(--lemma-ink-3)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-7">
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'white', borderColor: 'var(--lemma-cream-2)' }}>
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--lemma-cream-2)', background: 'oklch(98% 0.005 90)' }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--lemma-ink-3)' }}>학생별 제출 현황</p>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--lemma-cream-2)' }}>
                {['학생', '상태', '제출일시', ''].map((h, i) => (
                  <th key={i} className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide"
                    style={{ color: 'var(--lemma-ink-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roster.map(({ id: studentId, name, submission }) => {
                const badge = statusBadge(submission)
                return (
                  <tr key={studentId} className="hover:bg-stone-50" style={{ borderBottom: '1px solid oklch(95% 0.005 90)' }}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: 'oklch(88% 0.08 75)', color: 'var(--lemma-ink)' }}>
                          {name[0]}
                        </div>
                        <span className="text-sm font-semibold" style={{ color: 'var(--lemma-ink)' }}>{name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full"
                        style={{ background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--lemma-ink-3)' }}>
                      {submission?.submitted_at
                        ? new Date(submission.submitted_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {submission && (
                        <Link href={`/student/assignments/${assignment.id}/feedback?submissionId=${submission.id}`}
                          className="text-xs px-3 py-1.5 rounded-lg border hover:bg-stone-50 transition-colors"
                          style={{ borderColor: 'var(--lemma-cream-2)', color: 'var(--lemma-ink-2)' }}>
                          결과 보기 →
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
