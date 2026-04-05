export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { queryOne, execute, getR2 } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'student') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const assignmentId = formData.get('assignmentId') as string
  const photos = formData.getAll('photos') as File[]

  if (!assignmentId || photos.length === 0) {
    return NextResponse.json({ error: 'Missing assignmentId or photos' }, { status: 400 })
  }

  // Check assignment exists and student is enrolled
  const assignment = await queryOne<{ id: string; student_ids: string }>(
    'SELECT id, student_ids FROM assignments WHERE id = ?',
    [assignmentId]
  )

  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  const { parseJsonArray } = await import('@/lib/utils')
  const studentIds = parseJsonArray(assignment.student_ids)
  if (!studentIds.includes(session.user.id)) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
  }

  // Check no duplicate submission
  const existing = await queryOne(
    'SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ?',
    [assignmentId, session.user.id]
  )
  if (existing) {
    return NextResponse.json({ error: 'Already submitted' }, { status: 409 })
  }

  // Validate photos
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg']
  const MAX_SIZE = 10 * 1024 * 1024
  if (photos.length > 5) return NextResponse.json({ error: '사진은 최대 5장까지 가능해요' }, { status: 400 })
  for (const file of photos) {
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: '이미지 파일만 업로드 가능해요' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: '파일 크기는 10MB 이하여야 해요' }, { status: 400 })
  }

  // Upload photos to R2
  const MIME_TO_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' }
  const r2 = getR2()
  const submissionId = crypto.randomUUID()
  const photoKeys: string[] = []

  for (let i = 0; i < photos.length; i++) {
    const file = photos[i]
    const ext = MIME_TO_EXT[file.type] ?? 'jpg'
    const key = `submissions/${submissionId}/${i}.${ext}`

    const buffer = await file.arrayBuffer()
    await r2.put(key, buffer, { httpMetadata: { contentType: file.type } })
    photoKeys.push(key)
  }

  // Create submission record
  await execute(
    'INSERT INTO submissions (id, assignment_id, student_id, photo_urls, status) VALUES (?, ?, ?, ?, ?)',
    [submissionId, assignmentId, session.user.id, JSON.stringify(photoKeys), 'pending']
  )

  const submission = await queryOne('SELECT * FROM submissions WHERE id = ?', [submissionId])
  if (!submission) {
    return NextResponse.json({ error: 'Failed to create submission' }, { status: 500 })
  }

  // Trigger AI grading asynchronously (fire and forget)
  const gradeKey = process.env.INTERNAL_GRADE_KEY
  if (!gradeKey) {
    console.error('[submissions] INTERNAL_GRADE_KEY not set — grading skipped')
  } else {
    const baseUrl = process.env.NEXTAUTH_URL ?? `https://${req.headers.get('host')}`
    fetch(`${baseUrl}/api/ai/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': gradeKey },
      body: JSON.stringify({ submissionId }),
    }).catch((err) => console.error('[submissions] Failed to trigger grading:', err))
  }

  return NextResponse.json({ submissionId, status: 'processing' }, { status: 201 })
}
