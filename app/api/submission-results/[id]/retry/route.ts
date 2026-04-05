export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { queryOne, execute, getR2 } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Verify ownership
  const result = await queryOne<{
    id: string; submission_id: string; similar_problem_id: string | null; retry_status: string | null
  }>(
    `SELECT sr.id, sr.submission_id, sr.similar_problem_id, sr.retry_status
     FROM submission_results sr
     JOIN submissions s ON s.id = sr.submission_id
     WHERE sr.id = ? AND s.student_id = ?`,
    [id, session.user.id]
  )

  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!result.similar_problem_id) return NextResponse.json({ error: 'No similar problem' }, { status: 400 })
  if (result.retry_status === 'done') return NextResponse.json({ error: 'Already retried' }, { status: 409 })

  const formData = await req.formData()
  const photo = formData.get('photo') as File | null
  if (!photo) return NextResponse.json({ error: 'Missing photo' }, { status: 400 })

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg']
  if (!ALLOWED_TYPES.includes(photo.type)) return NextResponse.json({ error: '이미지 파일만 가능해요' }, { status: 400 })
  if (photo.size > 10 * 1024 * 1024) return NextResponse.json({ error: '10MB 이하 파일만 가능해요' }, { status: 400 })

  // Upload to R2
  const MIME_TO_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' }
  const ext = MIME_TO_EXT[photo.type] ?? 'jpg'
  const key = `retries/${id}/${Date.now()}.${ext}`
  const r2 = getR2()
  const buffer = await photo.arrayBuffer()
  await r2.put(key, buffer, { httpMetadata: { contentType: photo.type } })

  await execute(
    `UPDATE submission_results SET retry_photo_urls = ?, retry_status = 'pending', retry_submitted_at = ? WHERE id = ?`,
    [JSON.stringify([key]), new Date().toISOString(), id]
  )

  // Trigger async grading
  const gradeKey = process.env.INTERNAL_GRADE_KEY
  if (gradeKey) {
    const baseUrl = process.env.NEXTAUTH_URL ?? `https://${req.headers.get('host')}`
    fetch(`${baseUrl}/api/ai/grade-retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': gradeKey },
      body: JSON.stringify({ submissionResultId: id }),
    }).catch(err => console.error('[retry] Failed to trigger grading:', err))
  }

  return NextResponse.json({ ok: true, status: 'pending' })
}
