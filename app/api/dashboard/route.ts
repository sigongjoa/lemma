export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { query, queryOne } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [
    totalStudentsRow,
    allSubmissions,
    allResults,
    recentAssignments,
  ] = await Promise.all([
    queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM users WHERE role = ?', ['student']),
    query<{ id: string; assignment_id: string; student_id: string; status: string; total_score: number; submitted_at: string }>(
      'SELECT id, assignment_id, student_id, status, total_score, submitted_at FROM submissions'
    ),
    query<{ problem_id: string; is_correct: number; submission_id: string }>(
      'SELECT problem_id, is_correct, submission_id FROM submission_results'
    ),
    query<{ id: string; title: string; due_date: string; student_ids: string }>(
      'SELECT id, title, due_date, student_ids FROM assignments ORDER BY created_at DESC LIMIT 10'
    ),
  ])

  // Today's submissions
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const submittedToday = allSubmissions.filter(s => new Date(s.submitted_at) >= today).length

  // Average score
  const done = allSubmissions.filter(s => s.status === 'done' && s.total_score != null)
  const avgScore = done.length > 0
    ? Math.round(done.reduce((a, s) => a + s.total_score, 0) / done.length)
    : 0

  // Problem wrong rates
  const problemStats: Record<string, { correct: number; total: number }> = {}
  for (const r of allResults) {
    if (!problemStats[r.problem_id]) problemStats[r.problem_id] = { correct: 0, total: 0 }
    problemStats[r.problem_id].total++
    if (r.is_correct) problemStats[r.problem_id].correct++
  }

  // Concept tag stats
  const conceptStats: Record<string, { correct: number; total: number }> = {}
  if (allResults.length > 0) {
    const problemIds = [...new Set(allResults.map(r => r.problem_id))]
    const placeholders = problemIds.map(() => '?').join(', ')
    const problems = await query<{ id: string; concept_tags: string }>(
      `SELECT id, concept_tags FROM problems WHERE id IN (${placeholders})`,
      problemIds
    )

    const tagMap: Record<string, string[]> = {}
    for (const p of problems) tagMap[p.id] = JSON.parse(p.concept_tags ?? '[]')

    for (const r of allResults) {
      for (const tag of tagMap[r.problem_id] ?? []) {
        if (!conceptStats[tag]) conceptStats[tag] = { correct: 0, total: 0 }
        conceptStats[tag].total++
        if (r.is_correct) conceptStats[tag].correct++
      }
    }
  }

  // Parse student_ids JSON in recent assignments
  const parsedRecentAssignments = recentAssignments.map(a => ({
    ...a,
    student_ids: JSON.parse(a.student_ids ?? '[]'),
  }))

  return NextResponse.json({
    totalStudents: totalStudentsRow?.count ?? 0,
    submittedToday,
    avgScore,
    pendingCount: allSubmissions.filter(s => s.status === 'pending' || s.status === 'processing').length,
    recentAssignments: parsedRecentAssignments,
    submissions: allSubmissions,
    problemStats,
    conceptStats,
  })
}
