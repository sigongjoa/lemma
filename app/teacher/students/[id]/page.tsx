export const runtime = 'edge'

import { auth } from '@/auth'
import { query, queryOne } from '@/lib/db'
import { parseJsonArray } from '@/lib/utils'
import { notFound } from 'next/navigation'
import Link from 'next/link'

async function getStudentDetail(id: string) {
  const [
    student,
    submissionsRaw,
  ] = await Promise.all([
    queryOne<{ id: string; name: string; created_at: string }>(
      `SELECT id, name, created_at FROM users WHERE id = ?`, [id]
    ),
    query<{ id: string; student_id: string; assignment_id: string; status: string; total_score: number | null; submitted_at: string; assignment_title: string }>(
      `SELECT s.*, a.title as assignment_title FROM submissions s
       LEFT JOIN assignments a ON a.id = s.assignment_id
       WHERE s.student_id = ? AND s.status = 'done'
       ORDER BY s.submitted_at ASC`,
      [id]
    ),
  ])

  if (!student) return null

  const submissions = submissionsRaw.map(s => ({
    ...s,
    assignment: { title: s.assignment_title },
  }))

  const submissionIds = submissions.map(s => s.id)
  const results = submissionIds.length > 0
    ? await query<{ submission_id: string; is_correct: number; concept_tags: string; submitted_at: string }>(
        `SELECT sr.submission_id, sr.is_correct, p.concept_tags, s.submitted_at
         FROM submission_results sr
         LEFT JOIN problems p ON p.id = sr.problem_id
         LEFT JOIN submissions s ON s.id = sr.submission_id
         WHERE sr.submission_id IN (${submissionIds.map(() => '?').join(',')})
         ORDER BY s.submitted_at ASC`,
        submissionIds
      )
    : []

  // Concept stats + streak computation
  const conceptMap: Record<string, { correct: number; total: number; history: boolean[] }> = {}
  for (const r of results) {
    const tags = parseJsonArray(r.concept_tags)
    for (const tag of tags) {
      if (!conceptMap[tag]) conceptMap[tag] = { correct: 0, total: 0, history: [] }
      conceptMap[tag].total++
      conceptMap[tag].history.push(Boolean(r.is_correct))
      if (r.is_correct) conceptMap[tag].correct++
    }
  }

  const conceptStats = Object.entries(conceptMap)
    .map(([tag, { correct, total, history }]) => {
      // Compute current consecutive wrong streak from the end
      let streak = 0
      for (let i = history.length - 1; i >= 0; i--) {
        if (!history[i]) streak++
        else break
      }
      const rate = Math.round((correct / total) * 100)
      const severity = streak >= 3 ? 'critical' : streak >= 2 ? 'concern' : streak >= 1 ? 'watch' : 'ok'
      return { tag, correct, total, rate, streak, severity }
    })
    .sort((a, b) => a.rate - b.rate)

  const scores = submissions.map(s => s.total_score).filter((v): v is number => v != null)
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0
  const minScore = scores.length > 0 ? Math.min(...scores) : 0

  return { student, submissions, conceptStats, avgScore, maxScore, minScore }
}

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await auth()
  const { id } = await params
  const data = await getStudentDetail(id)
  if (!data) notFound()

  const { student, submissions, conceptStats, avgScore, maxScore, minScore } = data

  // SVG chart data
  const chartW = 500
  const chartH = 100
  const padding = { l: 30, r: 10, t: 10, b: 20 }
  const innerW = chartW - padding.l - padding.r
  const innerH = chartH - padding.t - padding.b

  const points = submissions.map((s, i) => {
    const x = padding.l + (submissions.length > 1 ? (i / (submissions.length - 1)) * innerW : innerW / 2)
    const y = padding.t + innerH - ((s.total_score ?? 0) / 10) * innerH
    return { x, y, score: s.total_score, title: s.assignment?.title }
  })

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ')
  const areaPath = points.length > 0
    ? `M ${points[0].x} ${padding.t + innerH} L ${points.map(p => `${p.x},${p.y}`).join(' L ')} L ${points[points.length - 1].x} ${padding.t + innerH} Z`
    : ''


  return (
    <div>
      {/* Header */}
      <div className="px-7 py-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--lemma-cream-2)' }}>
        <div className="flex items-center gap-4">
          <Link href="/teacher/students" className="text-sm px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--lemma-cream-2)', color: 'var(--lemma-ink-2)' }}>← 목록</Link>
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
            style={{ background: 'oklch(88% 0.08 75)', color: 'var(--lemma-ink)' }}>
            {student.name[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--lemma-ink)' }}>{student.name}</h1>
            <p className="text-xs" style={{ color: 'var(--lemma-ink-3)' }}>
              가입 {new Date(student.created_at).toLocaleDateString('ko-KR')} · 총 {submissions.length}회 제출
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {[
            { label: '평균', value: `${avgScore}점`, color: 'var(--lemma-gold-d)' },
            { label: '최고', value: `${maxScore}점`, color: 'var(--lemma-green)' },
            { label: '최저', value: `${minScore}점`, color: 'var(--lemma-ink-3)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center px-4 py-2 rounded-xl border" style={{ background: 'white', borderColor: 'var(--lemma-cream-2)' }}>
              <p className="text-xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs" style={{ color: 'var(--lemma-ink-3)' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-7 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Score chart */}
          <div className="rounded-2xl border p-6" style={{ background: 'white', borderColor: 'var(--lemma-cream-2)' }}>
            <h2 className="text-sm font-bold mb-5" style={{ color: 'var(--lemma-ink)' }}>점수 추이</h2>
            {submissions.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-sm" style={{ color: 'var(--lemma-ink-3)' }}>데이터 없음</div>
            ) : (
              <>
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" style={{ height: '120px' }}>
                  {/* Grid lines */}
                  {[0, 25, 50, 75, 100].map(pct => {
                    const y = padding.t + innerH - (pct / 100) * innerH
                    return (
                      <g key={pct}>
                        <line x1={padding.l} y1={y} x2={chartW - padding.r} y2={y}
                          stroke="oklch(88% 0.012 90)" strokeWidth="1" strokeDasharray={pct === 0 ? '0' : '4,4'} />
                        <text x={padding.l - 4} y={y + 3} textAnchor="end" fontSize="7" fill="oklch(58% 0.02 265)">
                          {pct}
                        </text>
                      </g>
                    )
                  })}
                  {/* Area */}
                  {areaPath && <path d={areaPath} fill="oklch(72% 0.14 75 / 0.12)" />}
                  {/* Line */}
                  {points.length > 1 && (
                    <polyline points={polyline} fill="none" stroke="oklch(72% 0.14 75)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                  {/* Points */}
                  {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 5 : 4}
                      fill={i === points.length - 1 ? 'white' : 'oklch(72% 0.14 75)'}
                      stroke="oklch(72% 0.14 75)" strokeWidth="2.5" />
                  ))}
                </svg>
                <div className="flex gap-4 mt-2 text-xs" style={{ color: 'var(--lemma-ink-3)' }}>
                  <span>최저 <strong style={{ color: 'var(--lemma-ink)' }}>{minScore}점</strong></span>
                  <span>최고 <strong style={{ color: 'var(--lemma-ink)' }}>{maxScore}점</strong></span>
                  <span>{submissions.length}회 평균 <strong style={{ color: 'var(--lemma-gold-d)' }}>{avgScore}점</strong></span>
                </div>
              </>
            )}
          </div>

          {/* Concept stats */}
          <div className="rounded-2xl border p-6" style={{ background: 'white', borderColor: 'var(--lemma-cream-2)' }}>
            <h2 className="text-sm font-bold mb-5" style={{ color: 'var(--lemma-ink)' }}>개념별 정답률</h2>
            {conceptStats.length === 0 ? (
              <div className="h-24 flex items-center justify-center text-sm" style={{ color: 'var(--lemma-ink-3)' }}>데이터 없음</div>
            ) : (
              <div className="space-y-3">
                {conceptStats.map(({ tag, rate, streak, severity }) => (
                  <div key={tag} className="flex items-center gap-3">
                    <span className="text-xs w-20 flex-shrink-0 truncate" style={{ color: 'var(--lemma-ink-2)' }}>{tag}</span>
                    <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--lemma-cream-2)' }}>
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${rate}%`,
                        background: rate >= 80 ? 'var(--lemma-green)' : rate >= 60 ? 'var(--lemma-gold)' : 'var(--lemma-red)',
                      }} />
                    </div>
                    <span className="text-xs font-bold w-8 text-right flex-shrink-0" style={{
                      color: rate >= 80 ? 'var(--lemma-green)' : rate >= 60 ? 'var(--lemma-gold-d)' : 'var(--lemma-red)',
                    }}>{rate}%</span>
                    {streak >= 2 && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{
                        background: severity === 'critical' ? 'oklch(95% 0.06 25)' : 'oklch(95% 0.04 75)',
                        color: severity === 'critical' ? 'var(--lemma-red)' : 'oklch(45% 0.12 75)',
                      }}>
                        {streak}연속
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {conceptStats.filter(c => c.severity === 'critical' || c.severity === 'concern').length > 0 && (
              <div className="mt-4 p-3 rounded-xl" style={{ background: 'oklch(95% 0.06 25)', borderLeft: '3px solid var(--lemma-red)' }}>
                <p className="text-xs font-bold" style={{ color: 'var(--lemma-red)' }}>⚠ 반복 오답 패턴</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {conceptStats.filter(c => c.severity === 'critical' || c.severity === 'concern').map(c => (
                    <span key={c.tag} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: c.severity === 'critical' ? 'oklch(88% 0.1 25)' : 'oklch(93% 0.06 25)', color: 'var(--lemma-red)' }}>
                      {c.tag} {c.streak}연속
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submission history */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'white', borderColor: 'var(--lemma-cream-2)' }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--lemma-cream-2)' }}>
            <h2 className="text-sm font-bold" style={{ color: 'var(--lemma-ink)' }}>제출 이력</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--lemma-cream-2)' }}>
                {['숙제명', '제출일', '점수', '정답률'].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--lemma-ink-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...submissions].reverse().map(s => {
                const pct = s.total_score != null ? Math.round((s.total_score / 10) * 100) : 0
                return (
                  <tr key={s.id} className="hover:bg-stone-50" style={{ borderBottom: '1px solid oklch(95% 0.005 90)' }}>
                    <td className="px-6 py-3 text-sm font-semibold" style={{ color: 'var(--lemma-ink)' }}>{s.assignment?.title}</td>
                    <td className="px-6 py-3 text-sm" style={{ color: 'var(--lemma-ink-2)' }}>
                      {new Date(s.submitted_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-3">
                      <span className="font-bold" style={{ color: (s.total_score ?? 0) >= 8 ? 'var(--lemma-green)' : (s.total_score ?? 0) >= 6 ? 'var(--lemma-gold-d)' : 'var(--lemma-red)' }}>
                        {s.total_score}/10
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 rounded-full" style={{ width: '80px', background: 'var(--lemma-cream-2)' }}>
                          <div className="h-full rounded-full" style={{
                            width: `${pct}%`,
                            background: pct >= 80 ? 'var(--lemma-green)' : pct >= 60 ? 'var(--lemma-gold)' : 'var(--lemma-red)',
                          }} />
                        </div>
                        <span className="text-xs" style={{ color: 'var(--lemma-ink-3)' }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {submissions.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--lemma-ink-3)' }}>
                  아직 제출 이력이 없어요
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
