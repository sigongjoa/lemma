export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { queryOne, query, execute, getR2 } from '@/lib/db'
import { gradeProblem, generateSimilarProblem } from '@/lib/gemini'
import { verifyWithZ3 } from '@/lib/z3-client'

// Internal route — protected by shared secret
export async function POST(req: NextRequest) {
  const key = req.headers.get('x-internal-key')
  if (key !== process.env.INTERNAL_GRADE_KEY) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { submissionId } = await req.json() as { submissionId?: string }
  if (!submissionId) return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 })

  // Mark as processing
  await execute("UPDATE submissions SET status = 'processing' WHERE id = ?", [submissionId])

  try {
    const submission = await queryOne<{ id: string; assignment_id: string; photo_urls: string }>(
      'SELECT * FROM submissions WHERE id = ?',
      [submissionId]
    )
    if (!submission) throw new Error('Submission not found')

    const assignment = await queryOne<{ problem_set_id: string }>(
      'SELECT problem_set_id FROM assignments WHERE id = ?',
      [submission.assignment_id]
    )

    const problemSetId = assignment?.problem_set_id
    if (!problemSetId) throw new Error('Assignment not found')

    const problemSet = await queryOne<{ problem_ids: string }>(
      'SELECT problem_ids FROM problem_sets WHERE id = ?',
      [problemSetId]
    )
    if (!problemSet) throw new Error('Problem set not found')

    const problemIds: string[] = JSON.parse(problemSet.problem_ids ?? '[]')
    if (problemIds.length === 0) throw new Error('No problems found')

    const placeholders = problemIds.map(() => '?').join(', ')
    const problems = await query<{
      id: string
      body: string
      answer: string
      solution: string | null
      concept_tags: string
      z3_formula: string | null
    }>(
      `SELECT * FROM problems WHERE id IN (${placeholders})`,
      problemIds
    )

    if (problems.length === 0) throw new Error('No problems found')

    // Fetch the first photo from R2 and convert to base64
    const photoKeys: string[] = JSON.parse(submission.photo_urls ?? '[]')
    const r2 = getR2()
    const photoObject = await r2.get(photoKeys[0])
    if (!photoObject) throw new Error('Photo not found in R2')

    const imageBuffer = await photoObject.arrayBuffer()
    const imageBase64 = Buffer.from(imageBuffer).toString('base64')
    const imageMimeType = photoObject.httpMetadata?.contentType ?? 'image/jpeg'

    // Grade each problem in parallel
    const gradingPromises = problems.map(async (problem) => {
      try {
        const conceptTags: string[] = JSON.parse(problem.concept_tags ?? '[]')
        const result = await gradeProblem(
          imageBase64,
          imageMimeType,
          problem.body,
          problem.answer,
          problem.solution
        )
        return { problem: { ...problem, concept_tags: conceptTags }, result, error: null }
      } catch (err) {
        return { problem, result: null, error: err }
      }
    })

    const gradingResults = await Promise.all(gradingPromises)

    let totalCorrect = 0

    for (const { problem, result, error } of gradingResults) {
      if (error || !result) {
        const resultId = crypto.randomUUID()
        await execute(
          'INSERT INTO submission_results (id, submission_id, problem_id, is_correct, student_answer, ai_feedback, z3_verified, similar_problem_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [resultId, submissionId, problem.id, 0, null, '채점 중 오류가 발생했습니다', null, null]
        )
        continue
      }

      // Z3 verification for problems with a formula
      let z3Verified: boolean | null = null
      if (problem.z3_formula && result.studentAnswer) {
        const z3Result = await verifyWithZ3({
          formula: problem.z3_formula,
          studentAnswer: result.studentAnswer,
        })
        z3Verified = z3Result.valid
        if (result.isCorrect && !z3Result.valid) {
          result.isCorrect = false
          result.feedback = `수식 검증 실패: ${z3Result.reason}`
        }
      }

      if (result.isCorrect) totalCorrect++

      let similarProblemId: string | null = null

      if (!result.isCorrect) {
        try {
          const conceptTags = Array.isArray(problem.concept_tags)
            ? problem.concept_tags
            : JSON.parse((problem.concept_tags as unknown as string) ?? '[]')
          const similar = await generateSimilarProblem(
            problem.body,
            conceptTags,
            result.feedback
          )
          const similarId = crypto.randomUUID()
          await execute(
            'INSERT INTO similar_problems (id, original_problem_id, body, answer, concept_tags) VALUES (?, ?, ?, ?, ?)',
            [similarId, problem.id, similar.body, similar.answer, JSON.stringify(similar.conceptTags)]
          )
          similarProblemId = similarId
        } catch {
          // Similar problem generation failed — not critical
        }
      }

      const resultId = crypto.randomUUID()
      await execute(
        'INSERT INTO submission_results (id, submission_id, problem_id, is_correct, student_answer, ai_feedback, z3_verified, similar_problem_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [resultId, submissionId, problem.id, result.isCorrect ? 1 : 0, result.studentAnswer ?? null, result.feedback, z3Verified, similarProblemId]
      )
    }

    await execute(
      "UPDATE submissions SET status = 'done', total_score = ? WHERE id = ?",
      [totalCorrect, submissionId]
    )

    return NextResponse.json({ ok: true, score: totalCorrect, total: problems.length })
  } catch (err) {
    await execute("UPDATE submissions SET status = 'error' WHERE id = ?", [submissionId])
    console.error('[grade]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
