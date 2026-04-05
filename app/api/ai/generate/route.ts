export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { queryOne, execute } from '@/lib/db'
import { generateSimilarProblem } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { problemId?: string }
  const { problemId } = body
  if (!problemId) return NextResponse.json({ error: 'Missing problemId' }, { status: 400 })

  const problem = await queryOne<{ id: string; body: string; concept_tags: string }>(
    'SELECT id, body, concept_tags FROM problems WHERE id = ?',
    [problemId]
  )
  if (!problem) return NextResponse.json({ error: 'Problem not found' }, { status: 404 })

  const conceptTags: string[] = JSON.parse(problem.concept_tags ?? '[]')

  try {
    const similar = await generateSimilarProblem(problem.body, conceptTags, '')
    const id = crypto.randomUUID()
    await execute(
      'INSERT INTO similar_problems (id, original_problem_id, body, answer, concept_tags) VALUES (?, ?, ?, ?, ?)',
      [id, problemId, similar.body, similar.answer, JSON.stringify(similar.conceptTags)]
    )
    const inserted = await queryOne('SELECT * FROM similar_problems WHERE id = ?', [id])
    return NextResponse.json(inserted, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
