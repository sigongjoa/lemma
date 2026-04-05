export const runtime = 'edge'

import { auth } from '@/auth'
import { query } from '@/lib/db'
import { Assignment, Submission } from '@/types'
import Link from 'next/link'

interface AssignmentRow extends Assignment {
  ps_problem_ids: string | null
}

async function getStudentAssignments(studentId: string) {
  const [assignments, submissions] = await Promise.all([
    query<AssignmentRow>(
      `SELECT a.*, ps.problem_ids as ps_problem_ids
       FROM assignments a, json_each(a.student_ids) je
       LEFT JOIN problem_sets ps ON ps.id = a.problem_set_id
       WHERE je.value = ?
       ORDER BY a.due_date ASC`,
      [studentId]
    ),
    query<{ id: string; assignment_id: string; status: string; total_score: number | null; submitted_at: string }>(
      `SELECT id, assignment_id, status, total_score, submitted_at FROM submissions WHERE student_id = ?`,
      [studentId]
    ),
  ])

  return assignments.map((a) => ({
    ...a,
    student_ids: JSON.parse((a as unknown as { student_ids: string }).student_ids ?? '[]') as string[],
    problem_count: JSON.parse(a.ps_problem_ids ?? '[]').length as number,
    my_submission: submissions.find((s) => s.assignment_id === a.id) ?? null,
  }))
}

function getStatusInfo(assignment: Assignment & { my_submission: Submission | null }) {
  const sub = assignment.my_submission
  const now = new Date()
  const due = new Date(assignment.due_date)

  if (!sub) {
    const overdue = now > due
    return {
      label: overdue ? '기한 초과' : '미제출',
      color: overdue ? 'var(--lemma-red)' : 'var(--lemma-ink-3)',
      bg: overdue ? 'oklch(95% 0.06 25)' : 'var(--lemma-cream-2)',
      border: overdue ? 'var(--lemma-red)' : 'var(--lemma-cream-2)',
      action: '제출하기',
      actionHref: `/student/assignments/${assignment.id}/submit`,
      done: false,
    }
  }
  if (sub.status === 'processing' || sub.status === 'pending') {
    return {
      label: 'AI 채점 중',
      color: 'oklch(45% 0.12 75)',
      bg: 'oklch(93% 0.04 75)',
      border: 'var(--lemma-gold)',
      action: '결과 확인',
      actionHref: `/student/assignments/${assignment.id}/feedback`,
      done: false,
    }
  }
  if (sub.status === 'done') {
    return {
      label: '피드백 도착',
      color: 'oklch(38% 0.14 255)',
      bg: 'oklch(92% 0.05 255)',
      border: 'oklch(75% 0.12 255)',
      action: '결과 보기',
      actionHref: `/student/assignments/${assignment.id}/feedback`,
      done: true,
    }
  }
  return {
    label: '오류',
    color: 'var(--lemma-red)',
    bg: 'oklch(95% 0.06 25)',
    border: 'var(--lemma-red)',
    action: '다시 제출',
    actionHref: `/student/assignments/${assignment.id}/submit`,
    done: false,
  }
}

export default async function StudentHomePage() {
  const session = await auth()
  const assignments = await getStudentAssignments(session!.user.id)

  const pendingCount = assignments.filter((a) => !a.my_submission).length
  const feedbackCount = assignments.filter((a) => a.my_submission?.status === 'done').length
  const doneCount = assignments.filter((a) => a.my_submission?.status === 'done').length

  return (
    <div>
      {/* Header */}
      <div className="grid-bg px-5 pt-6 pb-5 border-b" style={{ borderColor: 'var(--lemma-cream-2)' }}>
        <div className="flex justify-between items-start mb-5">
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--lemma-ink-3)' }}>안녕하세요 👋</p>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--lemma-ink)' }}>
              {session!.user.name}
            </h1>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--lemma-ink-3)' }}>이번 주 평균</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--lemma-gold-d)' }}>
              —
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { num: pendingCount,  label: '미제출',     color: 'var(--lemma-red)' },
            { num: feedbackCount, label: '피드백 도착', color: 'oklch(45% 0.14 255)' },
            { num: doneCount,     label: '완료',        color: 'var(--lemma-green)' },
          ].map(({ num, label, color }) => (
            <div
              key={label}
              className="rounded-xl p-3 text-center border"
              style={{ background: 'white', borderColor: 'var(--lemma-cream-2)' }}
            >
              <p className="text-2xl font-bold" style={{ color }}>{num}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--lemma-ink-3)' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Assignment list */}
      <div className="px-5 py-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--lemma-ink-3)' }}>
          숙제 목록
        </p>

        {assignments.length === 0 && (
          <div className="text-center py-16" style={{ color: 'var(--lemma-ink-3)' }}>
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm">아직 출제된 숙제가 없어요</p>
          </div>
        )}

        {assignments.map((assignment) => {
          const status = getStatusInfo(assignment as unknown as Assignment & { my_submission: Submission | null })
          const due = new Date(assignment.due_date)
          const nowTs = new Date().getTime()
          const isOverdueSoon = due.getTime() - nowTs < 24 * 60 * 60 * 1000 && !assignment.my_submission
          const problemCount = (assignment as typeof assignment & { problem_count: number }).problem_count ?? 0

          return (
            <div
              key={assignment.id}
              className="rounded-2xl p-4 border"
              style={{
                background: 'white',
                borderColor: status.border,
                borderLeftWidth: '3px',
                opacity: status.done ? 0.65 : 1,
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 mr-3">
                  <p className="font-bold text-sm" style={{ color: 'var(--lemma-ink)' }}>
                    {assignment.title}
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: isOverdueSoon ? 'var(--lemma-red)' : 'var(--lemma-ink-3)' }}
                  >
                    {isOverdueSoon ? '⚠ ' : ''}
                    {problemCount > 0 ? `${problemCount}문제 · ` : ''}
                    마감{' '}
                    {due.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })}
                    {assignment.my_submission?.total_score != null &&
                      ` · ${assignment.my_submission.total_score}점`}
                  </p>
                </div>
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap"
                  style={{ background: status.bg, color: status.color }}
                >
                  ● {status.label}
                </span>
              </div>

              {!status.done && (
                <div className="flex justify-end">
                  <Link
                    href={status.actionHref}
                    className="text-xs font-semibold px-4 py-2 rounded-lg transition-all active:scale-95"
                    style={{
                      background: 'var(--lemma-ink)',
                      color: 'var(--lemma-cream)',
                    }}
                  >
                    {status.action} →
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
