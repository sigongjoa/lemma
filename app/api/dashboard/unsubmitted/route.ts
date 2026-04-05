export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { query } from '@/lib/db'
import { parseJsonArray } from '@/lib/utils'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Assignments due within 48 hours from now
  const now = new Date()
  const cutoff = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()

  const assignments = await query<{ id: string; title: string; due_date: string; student_ids: string }>(
    `SELECT id, title, due_date, student_ids FROM assignments
     WHERE due_date >= ? AND due_date <= ?
     ORDER BY due_date ASC`,
    [now.toISOString(), cutoff]
  )

  if (assignments.length === 0) return NextResponse.json([])

  const assignmentIds = assignments.map(a => a.id)
  const placeholders = assignmentIds.map(() => '?').join(', ')
  const submitted = await query<{ assignment_id: string; student_id: string }>(
    `SELECT assignment_id, student_id FROM submissions WHERE assignment_id IN (${placeholders})`,
    assignmentIds
  )

  // Get all student names
  const allStudentIds = [...new Set(assignments.flatMap(a => parseJsonArray(a.student_ids)))]
  const studentPlaceholders = allStudentIds.map(() => '?').join(', ')
  const students = allStudentIds.length > 0
    ? await query<{ id: string; name: string }>(
        `SELECT id, name FROM users WHERE id IN (${studentPlaceholders})`,
        allStudentIds
      )
    : []
  const studentMap = new Map(students.map(s => [s.id, s.name]))

  const result = assignments.map(a => {
    const enrolledIds = parseJsonArray(a.student_ids)
    const submittedIds = new Set(submitted.filter(s => s.assignment_id === a.id).map(s => s.student_id))
    const missing = enrolledIds
      .filter(id => !submittedIds.has(id))
      .map(id => ({ id, name: studentMap.get(id) ?? '알 수 없음' }))

    return { assignment: { id: a.id, title: a.title, due_date: a.due_date }, missing_students: missing }
  }).filter(r => r.missing_students.length > 0)

  return NextResponse.json(result)
}
