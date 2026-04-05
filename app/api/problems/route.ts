export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { query, queryOne, execute } from '@/lib/db'
import { parseJsonArray } from '@/lib/utils'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await query<{ id: string; concept_tags: string; [key: string]: unknown }>(
    'SELECT * FROM problems ORDER BY created_at DESC'
  )

  const problems = rows.map(p => ({
    ...p,
    concept_tags: parseJsonArray(p.concept_tags),
  }))

  return NextResponse.json(problems)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { title?: string; problemBody?: string; answer?: string; solution?: string; conceptTags?: string[]; z3Formula?: string }
  const { title, problemBody, answer, solution, conceptTags, z3Formula } = body

  if (!title || !problemBody || !answer) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const id = crypto.randomUUID()
  await execute(
    'INSERT INTO problems (id, title, body, answer, solution, concept_tags, z3_formula, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, title, problemBody, answer, solution ?? null, JSON.stringify(conceptTags ?? []), z3Formula ?? null, session.user.id]
  )

  const problem = await queryOne<{ id: string; concept_tags: string; [key: string]: unknown }>(
    'SELECT * FROM problems WHERE id = ?',
    [id]
  )

  if (!problem) return NextResponse.json({ error: 'Insert failed' }, { status: 500 })

  return NextResponse.json({ ...problem, concept_tags: JSON.parse(problem.concept_tags ?? '[]') }, { status: 201 })
}
