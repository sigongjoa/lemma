'use client'
export const runtime = 'edge'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'

interface Result {
  id: string
  problem_id: string
  is_correct: boolean
  student_answer: string | null
  ai_feedback: string | null
  problem: { title: string; body: string; concept_tags: string[] } | null
  similar_problem: { body: string; answer: string } | null
}

interface SubmissionData {
  id: string
  status: string
  total_score: number | null
  results: Result[]
  assignment?: { title: string }
}

export default function FeedbackPage() {
  const { id: assignmentId } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const router = useRouter()
  const submissionId = searchParams.get('submissionId')

  const [data, setData] = useState<SubmissionData | null>(null)
  const [assignmentTitle, setAssignmentTitle] = useState<string>('')
  const [polling, setPolling] = useState(true)

  // Fetch assignment title
  useEffect(() => {
    if (!assignmentId) return
    fetch(`/api/assignments/${assignmentId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { const a = d as { title?: string } | null; if (a?.title) setAssignmentTitle(a.title) })
      .catch(() => {})
  }, [assignmentId])

  const fetchSubmission = useCallback(async () => {
    if (!submissionId) return
    const res = await fetch(`/api/submissions/${submissionId}`)
    if (!res.ok) return
    const json = await res.json() as SubmissionData
    setData(json)
    if (json.status === 'done' || json.status === 'error') setPolling(false)
  }, [submissionId])

  useEffect(() => {
    fetchSubmission()
    if (!polling) return
    const interval = setInterval(fetchSubmission, 2000)
    const timeout = setTimeout(() => { setPolling(false) }, 60000)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling])

  const totalProblems = data?.results?.length ?? 0
  const correct = data?.results?.filter((r) => r.is_correct).length ?? 0
  const wrong = totalProblems - correct
  const pct = totalProblems > 0 ? Math.round((correct / totalProblems) * 100) : 0

  // Processing state
  if (!data || data.status === 'pending' || data.status === 'processing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-8"
        style={{ background: 'var(--lemma-cream)' }}>
        <div className="text-5xl animate-bounce">🤖</div>
        <div className="text-center">
          <p className="font-bold text-lg" style={{ color: 'var(--lemma-ink)' }}>AI 채점 중...</p>
          <p className="text-sm mt-2" style={{ color: 'var(--lemma-ink-3)' }}>약 30초 정도 걸려요. 잠시만 기다려주세요</p>
        </div>
        <div className="w-48 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--lemma-cream-2)' }}>
          <div className="h-full rounded-full animate-pulse" style={{ background: 'var(--lemma-gold)', width: '60%' }} />
        </div>
      </div>
    )
  }

  if (data.status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-8"
        style={{ background: 'var(--lemma-cream)' }}>
        <p className="text-4xl">❌</p>
        <p className="font-bold" style={{ color: 'var(--lemma-ink)' }}>채점 중 오류가 발생했어요</p>
        <button onClick={() => router.back()} className="text-sm underline" style={{ color: 'var(--lemma-ink-3)' }}>
          돌아가기
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--lemma-cream)' }}>
      {/* Score header — dark background */}
      <div className="px-5 py-5" style={{ background: 'var(--lemma-ink)' }}>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => router.push('/student')}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ border: '1px solid oklch(35% 0.02 265)', color: 'oklch(65% 0.01 265)' }}
          >
            ← 홈
          </button>
          <span className="text-xs" style={{ color: 'oklch(60% 0.01 265)' }}>채점 완료</span>
        </div>

        {assignmentTitle && (
          <p className="text-sm font-semibold mb-4" style={{ color: 'oklch(75% 0.01 265)' }}>
            {assignmentTitle}
          </p>
        )}

        <div className="flex items-center gap-5">
          {/* Score circle */}
          <div
            className="w-20 h-20 rounded-full flex flex-col items-center justify-center flex-shrink-0"
            style={{ border: '3px solid var(--lemma-gold)' }}
          >
            <span className="text-2xl font-bold leading-none" style={{ color: 'var(--lemma-gold)' }}>
              {data.total_score}
            </span>
            <span className="text-xs" style={{ color: 'oklch(55% 0.01 265)' }}>/ {totalProblems}점</span>
          </div>

          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1" style={{ color: 'oklch(60% 0.01 265)' }}>
              <span>정답률</span><span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'oklch(30% 0.02 265)' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--lemma-gold)' }} />
            </div>
            <div className="flex gap-4 mt-3 text-xs">
              <span style={{ color: 'oklch(65% 0.14 155)' }}>● 맞음 {correct}</span>
              <span style={{ color: 'oklch(65% 0.14 25)' }}>● 틀림 {wrong}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 px-5 py-4 space-y-4">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--lemma-ink-3)' }}>
          문제별 결과
        </p>

        {data.results.map((r, i) => (
          <div key={r.id}>
            {/* Result row */}
            <div className="flex gap-3 items-start py-3 border-b" style={{ borderColor: 'var(--lemma-cream-2)' }}>
              {/* O/X marker */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{
                  background: r.is_correct ? 'oklch(93% 0.08 155)' : 'oklch(95% 0.08 25)',
                  color: r.is_correct ? 'oklch(35% 0.14 155)' : 'oklch(40% 0.16 25)',
                }}
              >
                {r.is_correct ? 'O' : 'X'}
              </div>

              <div className="flex-1">
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--lemma-ink)' }}>
                  {i + 1}번. {r.problem?.title ?? '문제'}
                </p>
                {r.is_correct ? (
                  <p className="text-xs" style={{ color: 'var(--lemma-green)' }}>
                    정답: {r.student_answer} ✓
                  </p>
                ) : (
                  <>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--lemma-ink-2)' }}>
                      {r.ai_feedback}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {r.problem?.concept_tags?.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            background: 'oklch(95% 0.06 25)',
                            color: 'var(--lemma-red)',
                            border: '1px solid oklch(85% 0.1 25)',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Similar problem card */}
            {!r.is_correct && r.similar_problem && (
              <div
                className="mt-2 p-4 rounded-2xl"
                style={{ background: 'oklch(97% 0.012 255)', border: '1px solid oklch(85% 0.05 255)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'oklch(92% 0.06 255)', color: 'oklch(38% 0.14 255)' }}
                  >
                    ✦ AI 유사문제
                  </span>
                </div>
                <p className="text-sm font-semibold mb-3" style={{ color: 'var(--lemma-ink)' }}>
                  {r.similar_problem.body}
                </p>
                <button
                  className="w-full py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: 'oklch(52% 0.18 255)', color: 'white' }}
                  onClick={() => alert('준비 중인 기능이에요')}
                >
                  풀이 제출하기
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
