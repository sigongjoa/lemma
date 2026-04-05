export const runtime = 'edge'

import { auth } from '@/auth'
import { query } from '@/lib/db'

export default async function WrongNotesPage() {
  const session = await auth()

  // Get all wrong submission results for this student with joined problem and similar_problem
  const wrongResultsRaw = await query<{
    id: string
    submission_id: string
    student_answer: string | null
    ai_feedback: string | null
    is_correct: number
    created_at: string
    problem_id: string
    problem_title: string
    problem_body: string
    problem_answer: string
    problem_concept_tags: string
    similar_problem_id: string | null
    similar_problem_body: string | null
  }>(
    `SELECT sr.id, sr.submission_id, sr.student_answer, sr.ai_feedback, sr.is_correct, sr.created_at,
            p.id as problem_id, p.title as problem_title, p.body as problem_body, p.answer as problem_answer, p.concept_tags as problem_concept_tags,
            sp.id as similar_problem_id, sp.body as similar_problem_body
     FROM submission_results sr
     JOIN submissions sub ON sub.id = sr.submission_id
     LEFT JOIN problems p ON p.id = sr.problem_id
     LEFT JOIN similar_problems sp ON sp.original_problem_id = p.id
     WHERE sub.student_id = ? AND sr.is_correct = 0
     ORDER BY sr.created_at DESC`,
    [session!.user.id]
  )

  const wrongResults = wrongResultsRaw.map(r => ({
    ...r,
    problem: {
      id: r.problem_id,
      title: r.problem_title,
      body: r.problem_body,
      answer: r.problem_answer,
      concept_tags: JSON.parse(r.problem_concept_tags ?? '[]') as string[],
    },
    similar_problem: r.similar_problem_id ? { body: r.similar_problem_body } : null,
  }))

  // Group by concept tag
  type WrongResult = typeof wrongResults[number]
  const byTag: Record<string, WrongResult[]> = {}
  for (const r of wrongResults) {
    const tags: string[] = r.problem?.concept_tags ?? ['기타']
    for (const tag of tags) {
      if (!byTag[tag]) byTag[tag] = []
      byTag[tag]!.push(r)
    }
  }

  return (
    <div>
      <div className="grid-bg px-5 pt-6 pb-5 border-b" style={{ borderColor: 'var(--lemma-cream-2)' }}>
        <h2 className="text-xl font-bold" style={{ color: 'var(--lemma-ink)' }}>오답 노트</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--lemma-ink-3)' }}>
          총 {wrongResults.length}개 오답
        </p>
      </div>

      <div className="px-5 py-4 space-y-6">
        {Object.entries(byTag).map(([tag, results]) => (
          <div key={tag}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: 'var(--lemma-ink)', color: 'var(--lemma-cream)' }}>
                {tag}
              </span>
              <span className="text-xs" style={{ color: 'var(--lemma-ink-3)' }}>{results!.length}개</span>
            </div>

            <div className="space-y-3">
              {results!.map(r => (
                <div key={r.id} className="rounded-2xl border overflow-hidden" style={{ background: 'white', borderColor: 'var(--lemma-cream-2)' }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--lemma-cream-2)', background: 'oklch(98% 0.005 90)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--lemma-ink)' }}>
                      {r.problem?.title}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--lemma-ink-3)' }}>
                      {r.problem?.body}
                    </p>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex gap-2 text-xs">
                      <span className="font-bold" style={{ color: 'var(--lemma-red)' }}>내 답:</span>
                      <span style={{ color: 'var(--lemma-ink-2)' }}>{r.student_answer ?? '—'}</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="font-bold" style={{ color: 'var(--lemma-green)' }}>정답:</span>
                      <span style={{ color: 'var(--lemma-ink-2)' }}>{r.problem?.answer}</span>
                    </div>
                    {r.ai_feedback && (
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--lemma-ink-2)', borderLeft: '2px solid var(--lemma-gold)', paddingLeft: '8px' }}>
                        {r.ai_feedback}
                      </p>
                    )}

                    {/* Similar problem */}
                    {r.similar_problem && (
                      <div className="mt-2 p-3 rounded-xl" style={{ background: 'oklch(97% 0.012 255)', border: '1px solid oklch(88% 0.05 255)' }}>
                        <p className="text-xs font-bold mb-1" style={{ color: 'oklch(38% 0.14 255)' }}>✦ 유사 연습문제</p>
                        <p className="text-xs" style={{ color: 'var(--lemma-ink)' }}>
                          {r.similar_problem.body}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {(wrongResults?.length ?? 0) === 0 && (
          <div className="text-center py-16" style={{ color: 'var(--lemma-ink-3)' }}>
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--lemma-ink)' }}>오답이 없어요!</p>
            <p className="text-xs mt-1">모든 문제를 맞혔거나 아직 제출하지 않았어요</p>
          </div>
        )}
      </div>
    </div>
  )
}
