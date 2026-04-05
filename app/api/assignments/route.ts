export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { query, queryOne, execute } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (session.user.role === 'student') {
    const rows = await query<{ id: string; student_ids: string; problem_ids: string; [key: string]: unknown }>(
      `SELECT * FROM assignments
       WHERE EXISTS (SELECT 1 FROM json_each(student_ids) WHERE value = ?)
       ORDER BY due_date ASC`,
      [session.user.id]
    )
    const assignments = rows.map(a => ({
      ...a,
      student_ids: JSON.parse(a.student_ids ?? '[]'),
      problem_ids: JSON.parse((a.problem_ids as string) ?? '[]'),
    }))
    return NextResponse.json(assignments)
  }

  // Admin: get all with problem_set name
  const rows = await query<{
    id: string
    student_ids: string
    problem_set_id: string
    problem_set_name: string | null
    [key: string]: unknown
  }>(
    `SELECT a.*, ps.name AS problem_set_name
     FROM assignments a
     LEFT JOIN problem_sets ps ON ps.id = a.problem_set_id
     ORDER BY a.created_at DESC`
  )

  const assignments = rows.map(a => ({
    ...a,
    student_ids: JSON.parse(a.student_ids ?? '[]'),
    problem_set: a.problem_set_name ? { name: a.problem_set_name } : null,
  }))

  return NextResponse.json(assignments)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { problemSetId?: string; studentIds?: string[]; dueDate?: string; title?: string }
  const { problemSetId, studentIds, dueDate, title } = body

  if (!problemSetId || !studentIds?.length || !dueDate || !title) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const id = crypto.randomUUID()
  await execute(
    'INSERT INTO assignments (id, problem_set_id, student_ids, due_date, title, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    [id, problemSetId, JSON.stringify(studentIds), dueDate, title, session.user.id]
  )

  const assignment = await queryOne<{ id: string; student_ids: string; [key: string]: unknown }>(
    'SELECT * FROM assignments WHERE id = ?',
    [id]
  )

  if (!assignment) return NextResponse.json({ error: 'Insert failed' }, { status: 500 })

  return NextResponse.json(
    { ...assignment, student_ids: JSON.parse(assignment.student_ids ?? '[]') },
    { status: 201 }
  )
}
