export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const assignment = await queryOne<{ id: string; problem_set_id: string; student_ids: string; [key: string]: unknown }>(
    'SELECT * FROM assignments WHERE id = ?',
    [id]
  )
  if (!assignment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const studentIds: string[] = JSON.parse(assignment.student_ids ?? '[]')

  // Enrollment check for students
  if (session.user.role === 'student' && !studentIds.includes(session.user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch problem set
  const problemSet = await queryOne<{ id: string; problem_ids: string; [key: string]: unknown }>(
    'SELECT * FROM problem_sets WHERE id = ?',
    [assignment.problem_set_id]
  )

  // Fetch problems
  let problems: unknown[] = []
  if (problemSet) {
    const problemIds: string[] = JSON.parse(problemSet.problem_ids ?? '[]')
    if (problemIds.length > 0) {
      const placeholders = problemIds.map(() => '?').join(', ')
      const rows = await query<{ id: string; concept_tags: string; [key: string]: unknown }>(
        `SELECT * FROM problems WHERE id IN (${placeholders})`,
        problemIds
      )
      problems = rows.map(p => {
        const mapped: Record<string, unknown> = { ...p, concept_tags: JSON.parse(p.concept_tags ?? '[]') }
        if (session.user.role === 'student') {
          delete mapped.answer
          delete mapped.solution
          delete mapped.z3_formula
        }
        return mapped
      })
    }
  }

  // Fetch student's own submission if student role
  let mySubmission = null
  if (session.user.role === 'student') {
    const sub = await queryOne<{ id: string; photo_urls: string; [key: string]: unknown }>(
      'SELECT * FROM submissions WHERE assignment_id = ? AND student_id = ?',
      [id, session.user.id]
    )
    if (sub) {
      mySubmission = { ...sub, photo_urls: JSON.parse(sub.photo_urls ?? '[]') }
    }
  }

  return NextResponse.json({
    ...assignment,
    student_ids: studentIds,
    problem_set: problemSet
      ? { ...problemSet, problem_ids: JSON.parse(problemSet.problem_ids ?? '[]') }
      : null,
    problems,
    my_submission: mySubmission,
  })
}
