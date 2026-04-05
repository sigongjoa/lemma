export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { query, queryOne, execute } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const student = await queryOne<{ id: string; name: string; created_at: string }>(
    'SELECT id, name, created_at FROM users WHERE id = ?',
    [id]
  )
  if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Get done submissions with assignment title
  const submissions = await query<{
    id: string
    assignment_id: string
    student_id: string
    status: string
    total_score: number
    submitted_at: string
    title: string
  }>(
    `SELECT s.*, a.title
     FROM submissions s
     JOIN assignments a ON a.id = s.assignment_id
     WHERE s.student_id = ? AND s.status = 'done'
     ORDER BY s.submitted_at ASC`,
    [id]
  )

  // Get all submission IDs for this student
  const submissionIds = submissions.map(s => s.id)

  // Get submission results with concept_tags from problems
  type ResultRow = { is_correct: number; concept_tags: string }
  let results: ResultRow[] = []
  if (submissionIds.length > 0) {
    const placeholders = submissionIds.map(() => '?').join(', ')
    results = await query<ResultRow>(
      `SELECT sr.is_correct, p.concept_tags
       FROM submission_results sr
       JOIN problems p ON p.id = sr.problem_id
       WHERE sr.submission_id IN (${placeholders})`,
      submissionIds
    )
  }

  // Score history
  const scoreHistory = submissions.map(s => ({
    date: s.submitted_at,
    title: s.title ?? '',
    score: s.total_score,
  }))

  // Concept stats
  const conceptMap: Record<string, { correct: number; total: number }> = {}
  for (const r of results) {
    const tags: string[] = JSON.parse(r.concept_tags ?? '[]')
    for (const tag of tags) {
      if (!conceptMap[tag]) conceptMap[tag] = { correct: 0, total: 0 }
      conceptMap[tag].total++
      if (r.is_correct) conceptMap[tag].correct++
    }
  }

  const conceptStats = Object.entries(conceptMap).map(([tag, { correct, total }]) => ({
    tag,
    correct,
    total,
    rate: total > 0 ? Math.round((correct / total) * 100) : 0,
  })).sort((a, b) => a.rate - b.rate)

  return NextResponse.json({ student, scoreHistory, conceptStats, submissions })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await execute('DELETE FROM users WHERE id = ? AND role = ?', [id, 'student'])
  return NextResponse.json({ ok: true })
}
