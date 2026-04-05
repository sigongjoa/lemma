export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { queryOne, query } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const submission = await queryOne<{
    id: string
    student_id: string
    status: string
    total_score: number | null
    photo_urls: string
    [key: string]: unknown
  }>(
    'SELECT * FROM submissions WHERE id = ?',
    [id]
  )

  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (session.user.role === 'student' && submission.student_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const photoKeys: string[] = JSON.parse(submission.photo_urls ?? '[]')
  const photoUrls = photoKeys.map(key => `/api/file/${key}`)

  const results = await query<{
    id: string
    problem_id: string
    is_correct: number
    student_answer: string | null
    ai_feedback: string | null
    similar_problem_id: string | null
    problem_title: string | null
    problem_body: string | null
    problem_concept_tags: string | null
    sp_body: string | null
    sp_answer: string | null
    [key: string]: unknown
  }>(
    `SELECT
       sr.id, sr.problem_id, sr.is_correct, sr.student_answer, sr.ai_feedback, sr.similar_problem_id,
       p.title AS problem_title,
       p.body AS problem_body,
       p.concept_tags AS problem_concept_tags,
       sp.body AS sp_body,
       sp.answer AS sp_answer
     FROM submission_results sr
     LEFT JOIN problems p ON p.id = sr.problem_id
     LEFT JOIN similar_problems sp ON sp.id = sr.similar_problem_id
     WHERE sr.submission_id = ?`,
    [id]
  )

  const formattedResults = results.map(r => ({
    id: r.id,
    problem_id: r.problem_id,
    is_correct: Boolean(r.is_correct),
    student_answer: r.student_answer,
    ai_feedback: r.ai_feedback,
    problem: r.problem_id ? {
      title: r.problem_title,
      body: r.problem_body,
      concept_tags: JSON.parse(r.problem_concept_tags ?? '[]') as string[],
    } : null,
    similar_problem: r.similar_problem_id ? {
      body: r.sp_body,
      answer: r.sp_answer,
    } : null,
  }))

  return NextResponse.json({
    ...submission,
    photo_urls: photoKeys,
    signed_photo_urls: photoUrls,
    results: formattedResults,
  })
}
