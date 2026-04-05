export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { queryOne, query, execute, getR2 } from '@/lib/db'
import { extractAllAnswers, generateSimilarProblem } from '@/lib/gemini'
import { verifyWithZ3 } from '@/lib/z3-client'

// Internal route — protected by shared secret
export async function POST(req: NextRequest) {
  const key = req.headers.get('x-internal-key')
  if (key !== process.env.INTERNAL_GRADE_KEY) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { submissionId } = await req.json() as { submissionId?: string }
  if (!submissionId) return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 })

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
    if (!assignment?.problem_set_id) throw new Error('Assignment not found')

    const problemSet = await queryOne<{ problem_ids: string }>(
      'SELECT problem_ids FROM problem_sets WHERE id = ?',
      [assignment.problem_set_id]
    )
    if (!problemSet) throw new Error('Problem set not found')

    const problemIds: string[] = JSON.parse(problemSet.problem_ids ?? '[]')
    if (problemIds.length === 0) throw new Error('No problems in set')

    const placeholders = problemIds.map(() => '?').join(', ')
    const problems = await query<{
      id: string
      body: string
      answer: string
      solution: string | null
      concept_tags: string
      z3_formula: string | null
    }>(
      `SELECT id, body, answer, solution, concept_tags, z3_formula FROM problems WHERE id IN (${placeholders})`,
      problemIds
    )
    if (problems.length === 0) throw new Error('Problems not found in DB')

    // ── Step 1: Fetch photo ────────────────────────────────────────────────
    const photoKeys: string[] = JSON.parse(submission.photo_urls ?? '[]')
    const r2 = getR2()
    const photoObject = await r2.get(photoKeys[0])
    if (!photoObject) throw new Error('Photo not found in R2')

    const imageBuffer = await photoObject.arrayBuffer()
    const imageBase64 = Buffer.from(imageBuffer).toString('base64')
    const imageMimeType = photoObject.httpMetadata?.contentType ?? 'image/jpeg'

    // ── Step 2: Single Vision call — extract all answers ──────────────────
    const extracted = await extractAllAnswers(imageBase64, imageMimeType, problems)

    // Build a map of problemId → extracted answer
    const answerMap = new Map(extracted.map((e) => [e.problemId, e]))

    // ── Step 3: Grade each problem (compare answers + optional Z3) ────────
    type GradedProblem = {
      problem: typeof problems[number]
      conceptTags: string[]
      isCorrect: boolean
      studentAnswer: string
      feedback: string
      z3Verified: boolean | null
    }

    const graded: GradedProblem[] = []

    for (const problem of problems) {
      const extracted = answerMap.get(problem.id)
      const studentAnswer = extracted?.studentAnswer ?? '미기재'
      const conceptTags: string[] = JSON.parse(problem.concept_tags ?? '[]')

      // Simple string-based comparison (case-insensitive, trimmed)
      const normalise = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '')
      let isCorrect = normalise(studentAnswer) === normalise(problem.answer)
      let feedback = isCorrect ? '' : `정답: ${problem.answer}`
      let z3Verified: boolean | null = null

      // Z3 verification for problems with a formula
      if (problem.z3_formula && studentAnswer !== '미기재') {
        try {
          const z3Result = await verifyWithZ3({ formula: problem.z3_formula, studentAnswer })
          z3Verified = z3Result.valid
          if (isCorrect && !z3Result.valid) {
            isCorrect = false
            feedback = `수식 검증 실패: ${z3Result.reason}`
          }
        } catch {
          // Z3 unavailable — keep string comparison result
        }
      }

      graded.push({ problem, conceptTags, isCorrect, studentAnswer, feedback, z3Verified })
    }

    // ── Step 4: Generate similar problems for wrong answers in parallel ────
    const wrongItems = graded.filter((g) => !g.isCorrect)

    const similarResults = await Promise.all(
      wrongItems.map(async (g) => {
        try {
          const similar = await generateSimilarProblem(g.problem.body, g.conceptTags, g.feedback)
          const similarId = crypto.randomUUID()
          await execute(
            'INSERT INTO similar_problems (id, original_problem_id, body, answer, concept_tags) VALUES (?, ?, ?, ?, ?)',
            [similarId, g.problem.id, similar.body, similar.answer, JSON.stringify(similar.conceptTags)]
          )
          return { problemId: g.problem.id, similarProblemId: similarId }
        } catch {
          return { problemId: g.problem.id, similarProblemId: null }
        }
      })
    )

    const similarMap = new Map(similarResults.map((s) => [s.problemId, s.similarProblemId]))

    // ── Step 5: Persist results ────────────────────────────────────────────
    let totalCorrect = 0

    for (const g of graded) {
      if (g.isCorrect) totalCorrect++
      const resultId = crypto.randomUUID()
      await execute(
        'INSERT INTO submission_results (id, submission_id, problem_id, is_correct, student_answer, ai_feedback, z3_verified, similar_problem_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          resultId,
          submissionId,
          g.problem.id,
          g.isCorrect ? 1 : 0,
          g.studentAnswer,
          g.feedback || null,
          g.z3Verified,
          similarMap.get(g.problem.id) ?? null,
        ]
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
