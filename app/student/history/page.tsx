export const runtime = 'edge'

import { auth } from '@/auth'
import { query } from '@/lib/db'

export default async function HistoryPage() {
  const session = await auth()

  const submissionsRaw = await query<{ id: string; total_score: number | null; submitted_at: string; assignment_title: string }>(
    `SELECT s.id, s.total_score, s.submitted_at, a.title as assignment_title
     FROM submissions s
     LEFT JOIN assignments a ON a.id = s.assignment_id
     WHERE s.student_id = ? AND s.status = 'done'
     ORDER BY s.submitted_at DESC`,
    [session!.user.id]
  )
  const submissions = submissionsRaw.map(s => ({
    ...s,
    assignment: { title: s.assignment_title },
  }))

  const scores = submissions.map((s) => s.total_score).filter((x): x is number => x != null)
  const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

  return (
    <div>
      <div className="grid-bg px-5 pt-6 pb-5 border-b" style={{ borderColor: 'var(--lemma-cream-2)' }}>
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--lemma-ink)' }}>성적 이력</h2>
        <p className="text-sm" style={{ color: 'var(--lemma-ink-3)' }}>
          총 {submissions?.length ?? 0}회 제출 · 평균 <strong style={{ color: 'var(--lemma-gold-d)' }}>{avg}점</strong>
        </p>
      </div>

      <div className="px-5 py-4 space-y-3">
        {submissions?.map((s) => (
          <div key={s.id} className="rounded-2xl p-4 border" style={{ background: 'white', borderColor: 'var(--lemma-cream-2)' }}>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--lemma-ink)' }}>{s.assignment?.title}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--lemma-ink-3)' }}>
                  {new Date(s.submitted_at).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <span className="text-2xl font-bold" style={{ color: 'var(--lemma-gold-d)' }}>
                {s.total_score}점
              </span>
            </div>
          </div>
        ))}

        {(!submissions || submissions.length === 0) && (
          <div className="text-center py-16" style={{ color: 'var(--lemma-ink-3)' }}>
            <p className="text-4xl mb-3">📊</p>
            <p className="text-sm">아직 채점된 숙제가 없어요</p>
          </div>
        )}
      </div>
    </div>
  )
}
