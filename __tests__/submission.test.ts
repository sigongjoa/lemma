/**
 * Unit tests for submission status logic
 */

type SubmissionStatus = 'pending' | 'processing' | 'done' | 'error'

interface TestSubmission {
  id?: string
  student_id?: string
  photo_urls?: string[]
  assignment_id?: string
  status: SubmissionStatus
  total_score: number | null
  submitted_at: string
}

interface Assignment {
  id: string
  due_date: string
  my_submission: TestSubmission | null
}

function getAssignmentStatus(assignment: Assignment): {
  label: string
  actionLabel: string
  isOverdue: boolean
} {
  const now = new Date()
  const due = new Date(assignment.due_date)
  const sub = assignment.my_submission

  if (!sub) {
    return {
      label: due < now ? '기한 초과' : '미제출',
      actionLabel: '제출하기',
      isOverdue: due < now,
    }
  }

  const statusMap: Record<string, { label: string; actionLabel: string }> = {
    pending:    { label: 'AI 채점 중',  actionLabel: '결과 확인' },
    processing: { label: 'AI 채점 중',  actionLabel: '결과 확인' },
    done:       { label: '피드백 도착', actionLabel: '결과 보기' },
    error:      { label: '오류',        actionLabel: '다시 제출' },
  }

  return { ...statusMap[sub.status], isOverdue: false }
}

describe('getAssignmentStatus', () => {
  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const pastDate   = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  it('returns 미제출 for unsubmitted assignment with future due date', () => {
    const result = getAssignmentStatus({ id: '1', due_date: futureDate, my_submission: null })
    expect(result.label).toBe('미제출')
    expect(result.actionLabel).toBe('제출하기')
    expect(result.isOverdue).toBe(false)
  })

  it('returns 기한 초과 for unsubmitted past-due assignment', () => {
    const result = getAssignmentStatus({ id: '1', due_date: pastDate, my_submission: null })
    expect(result.label).toBe('기한 초과')
    expect(result.isOverdue).toBe(true)
  })

  it('returns AI 채점 중 for processing submission', () => {
    const sub: TestSubmission = { id: '2', status: 'processing', total_score: null, submitted_at: new Date().toISOString() }
    const result = getAssignmentStatus({ id: '1', due_date: futureDate, my_submission: sub })
    expect(result.label).toBe('AI 채점 중')
  })

  it('returns 피드백 도착 for done submission', () => {
    const sub: TestSubmission = { id: '2', status: 'done', total_score: 8, submitted_at: new Date().toISOString() }
    const result = getAssignmentStatus({ id: '1', due_date: futureDate, my_submission: sub })
    expect(result.label).toBe('피드백 도착')
    expect(result.actionLabel).toBe('결과 보기')
  })

  it('returns 오류 for errored submission', () => {
    const sub: TestSubmission = { id: '2', status: 'error', total_score: null, submitted_at: new Date().toISOString() }
    const result = getAssignmentStatus({ id: '1', due_date: futureDate, my_submission: sub })
    expect(result.label).toBe('오류')
    expect(result.actionLabel).toBe('다시 제출')
  })
})

describe('Score calculation', () => {
  it('calculates percentage correctly', () => {
    const calcPct = (correct: number, total: number) =>
      total > 0 ? Math.round((correct / total) * 100) : 0

    expect(calcPct(8, 10)).toBe(80)
    expect(calcPct(10, 10)).toBe(100)
    expect(calcPct(0, 10)).toBe(0)
    expect(calcPct(0, 0)).toBe(0)
    expect(calcPct(3, 7)).toBe(43)
  })

  it('calculates average score correctly', () => {
    const calcAvg = (scores: number[]) =>
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0

    expect(calcAvg([80, 90, 70])).toBe(80)
    expect(calcAvg([100])).toBe(100)
    expect(calcAvg([])).toBe(0)
    expect(calcAvg([7, 8, 9, 10])).toBe(9)
  })
})

export {}
