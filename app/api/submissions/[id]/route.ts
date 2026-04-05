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
    photo_urls: string
    [key: string]: unknown
  }>(
    'SELECT * FROM submissions WHERE id = ?',
    [id]
  )

  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Students can only view their own submissions
  if (session.user.role === 'student' && submission.student_id !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const photoKeys: string[] = JSON.parse(submission.photo_urls ?? '[]')
  // Build proxy URLs instead of signed URLs
  const photoUrls = photoKeys.map(key => `/api/file/${key}`)

  // Fetch submission results with problem info and similar_problem
  const results = await query<{
    id: string
    problem_id: string
    is_correct: number
    feedback: string | null
    problem_title: string | null
    problem_body: string | null
    problem_concept_tags: string | null
    similar_problem_id: string | null
    similar_problem_title: string | null
    similar_problem_body: string | null
    similar_problem_answer: string | null
    [key: string]: unknown
  }>(
    `SELECT
       sr.*,
       p.title AS problem_title,
       p.body AS problem_body,
       p.concept_tags AS problem_concept_tags,
       sp.id AS similar_problem_id,
       sp.title AS similar_problem_title,
       sp.body AS similar_problem_body,
       sp.answer AS similar_problem_answer
     FROM submission_results sr
     LEFT JOIN problems p ON p.id = sr.problem_id
     LEFT JOIN similar_problems sp ON sp.id = sr.similar_problem_id
     WHERE sr.submission_id = ?`,
    [id]
  )

  const formattedResults = results.map(r => ({
    ...r,
    problem: r.problem_id
      ? {
          id: r.problem_id,
          title: r.problem_title,
          body: r.problem_body,
          concept_tags: JSON.parse(r.problem_concept_tags ?? '[]'),
        }
      : null,
    similar_problem: r.similar_problem_id
      ? {
          id: r.similar_problem_id,
          title: r.similar_problem_title,
          body: r.similar_problem_body,
          answer: r.similar_problem_answer,
        }
      : null,
  }))

  return NextResponse.json({
    ...submission,
    photo_urls: photoKeys,
    signed_photo_urls: photoUrls,
    results: formattedResults,
  })
}
