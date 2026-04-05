export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { query, queryOne, execute } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await query<{ id: string; problem_ids: string; [key: string]: unknown }>(
    'SELECT * FROM problem_sets ORDER BY created_at DESC'
  )

  const problemSets = rows.map(ps => ({
    ...ps,
    problem_ids: JSON.parse(ps.problem_ids ?? '[]'),
  }))

  return NextResponse.json(problemSets)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, problemIds } = await req.json() as { name?: string; problemIds?: string[] }
  if (!name || !problemIds?.length) {
    return NextResponse.json({ error: 'Missing name or problemIds' }, { status: 400 })
  }

  const id = crypto.randomUUID()
  await execute(
    'INSERT INTO problem_sets (id, name, problem_ids, created_by) VALUES (?, ?, ?, ?)',
    [id, name, JSON.stringify(problemIds), session.user.id]
  )

  const problemSet = await queryOne<{ id: string; problem_ids: string; [key: string]: unknown }>(
    'SELECT * FROM problem_sets WHERE id = ?',
    [id]
  )

  if (!problemSet) return NextResponse.json({ error: 'Insert failed' }, { status: 500 })

  return NextResponse.json({ ...problemSet, problem_ids: JSON.parse(problemSet.problem_ids ?? '[]') }, { status: 201 })
}
