/**
 * Tests for dashboard data aggregation logic
 */

interface TestSubmission {
  id?: string
  student_id: string
  status: string
  total_score: number | null
  submitted_at: string
}

interface ConceptResult {
  is_correct: boolean
  concept_tags: string[]
}

function calcDashboardStats(submissions: TestSubmission[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const done = submissions.filter(s => s.status === 'done' && s.total_score != null)
  const submittedToday = submissions.filter(s => new Date(s.submitted_at) >= today).length
  const avgScore = done.length > 0
    ? Math.round(done.reduce((a, s) => a + (s.total_score ?? 0), 0) / done.length)
    : 0
  const pendingCount = submissions.filter(s => s.status === 'pending' || s.status === 'processing').length

  return { submittedToday, avgScore, pendingCount }
}

function calcConceptStats(results: ConceptResult[]) {
  const map: Record<string, { correct: number; total: number }> = {}
  for (const r of results) {
    for (const tag of r.concept_tags) {
      if (!map[tag]) map[tag] = { correct: 0, total: 0 }
      map[tag].total++
      if (r.is_correct) map[tag].correct++
    }
  }
  return Object.entries(map).map(([tag, { correct, total }]) => ({
    tag, correct, total,
    rate: Math.round((correct / total) * 100),
  }))
}

describe('calcDashboardStats', () => {
  const todayISO = new Date().toISOString()
  const yesterdayISO = new Date(Date.now() - 86400000).toISOString()

  it('counts today submissions correctly', () => {
    const subs: TestSubmission[] = [
      { student_id: '1', status: 'done', total_score: 8, submitted_at: todayISO },
      { student_id: '2', status: 'done', total_score: 9, submitted_at: yesterdayISO },
    ]
    expect(calcDashboardStats(subs).submittedToday).toBe(1)
  })

  it('calculates average score from done submissions', () => {
    const subs: TestSubmission[] = [
      { student_id: '1', status: 'done', total_score: 8, submitted_at: todayISO },
      { student_id: '2', status: 'done', total_score: 6, submitted_at: todayISO },
      { student_id: '3', status: 'processing', total_score: null, submitted_at: todayISO },
    ]
    expect(calcDashboardStats(subs).avgScore).toBe(7)
  })

  it('returns 0 average when no done submissions', () => {
    const subs: TestSubmission[] = [
      { student_id: '1', status: 'processing', total_score: null, submitted_at: todayISO },
    ]
    expect(calcDashboardStats(subs).avgScore).toBe(0)
  })

  it('counts pending and processing correctly', () => {
    const subs: TestSubmission[] = [
      { student_id: '1', status: 'pending', total_score: null, submitted_at: todayISO },
      { student_id: '2', status: 'processing', total_score: null, submitted_at: todayISO },
      { student_id: '3', status: 'done', total_score: 9, submitted_at: todayISO },
    ]
    expect(calcDashboardStats(subs).pendingCount).toBe(2)
  })
})

describe('calcConceptStats', () => {
  it('calculates correct rates per concept', () => {
    const results: ConceptResult[] = [
      { is_correct: true,  concept_tags: ['이차방정식', '근의 공식'] },
      { is_correct: false, concept_tags: ['이차방정식'] },
      { is_correct: true,  concept_tags: ['인수분해'] },
    ]
    const stats = calcConceptStats(results)
    const quad = stats.find(s => s.tag === '이차방정식')
    const factor = stats.find(s => s.tag === '인수분해')
    const formula = stats.find(s => s.tag === '근의 공식')

    expect(quad?.rate).toBe(50)
    expect(factor?.rate).toBe(100)
    expect(formula?.rate).toBe(100)
  })

  it('handles empty results', () => {
    expect(calcConceptStats([])).toHaveLength(0)
  })
})

export {}
