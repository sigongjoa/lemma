export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { queryOne, execute, getR2 } from '@/lib/db'
import { extractAllAnswers } from '@/lib/gemini'
import { parseJsonArray } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-internal-key')
  if (key !== process.env.INTERNAL_GRADE_KEY) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { submissionResultId } = await req.json() as { submissionResultId?: string }
  if (!submissionResultId) return NextResponse.json({ error: 'Missing submissionResultId' }, { status: 400 })

  await execute(`UPDATE submission_results SET retry_status = 'processing' WHERE id = ?`, [submissionResultId])

  try {
    const result = await queryOne<{
      id: string; retry_photo_urls: string | null; similar_problem_id: string | null
    }>(
      'SELECT id, retry_photo_urls, similar_problem_id FROM submission_results WHERE id = ?',
      [submissionResultId]
    )
    if (!result) throw new Error('Result not found')
    if (!result.similar_problem_id) throw new Error('No similar problem')

    const similarProblem = await queryOne<{ id: string; body: string; answer: string }>(
      'SELECT id, body, answer FROM similar_problems WHERE id = ?',
      [result.similar_problem_id]
    )
    if (!similarProblem) throw new Error('Similar problem not found')

    const photoKeys = parseJsonArray(result.retry_photo_urls)
    if (photoKeys.length === 0) throw new Error('No photo')

    const r2 = getR2()
    const photoObject = await r2.get(photoKeys[0])
    if (!photoObject) throw new Error('Photo not found in R2')

    const imageBuffer = await photoObject.arrayBuffer()
    const imageBase64 = Buffer.from(imageBuffer).toString('base64')
    const imageMimeType = photoObject.httpMetadata?.contentType ?? 'image/jpeg'

    // Single vision call to extract the answer
    const extracted = await extractAllAnswers(imageBase64, imageMimeType, [{
      id: similarProblem.id,
      body: similarProblem.body,
      answer: similarProblem.answer,
    }])

    const studentAnswer = extracted[0]?.studentAnswer ?? '미기재'
    const normalise = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '')
    const isCorrect = normalise(studentAnswer) === normalise(similarProblem.answer)
    const feedback = isCorrect ? '' : `정답: ${similarProblem.answer}`

    await execute(
      `UPDATE submission_results SET
         retry_status = 'done',
         retry_is_correct = ?,
         retry_student_answer = ?,
         retry_ai_feedback = ?
       WHERE id = ?`,
      [isCorrect ? 1 : 0, studentAnswer, feedback || null, submissionResultId]
    )

    return NextResponse.json({ ok: true, isCorrect })
  } catch (err) {
    await execute(`UPDATE submission_results SET retry_status = 'error' WHERE id = ?`, [submissionResultId])
    console.error('[grade-retry]', err)
    return NextResponse.json({ error: '재채점 중 오류가 발생했습니다' }, { status: 500 })
  }
}
