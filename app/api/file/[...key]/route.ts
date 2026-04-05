export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getR2 } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { key } = await params
  const objectKey = key.join('/')

  // Path traversal guard
  if (key.some(segment => segment.includes('..'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Ownership check for submission files
  if (objectKey.startsWith('submissions/')) {
    const { queryOne: qOne } = await import('@/lib/db')
    // key structure: submissions/<submissionId>/...
    const submissionId = key[1]
    if (submissionId) {
      const sub = await qOne<{ student_id: string }>(
        'SELECT student_id FROM submissions WHERE id = ?',
        [submissionId]
      )
      const isOwner = sub?.student_id === session.user.id
      const isAdmin = session.user.role === 'admin'
      if (!isOwner && !isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
  }

  const r2 = getR2()
  const object = await r2.get(objectKey)

  if (!object) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const contentType = object.httpMetadata?.contentType ?? 'application/octet-stream'
  const headers = new Headers({
    'Content-Type': contentType,
    'Cache-Control': 'private, max-age=3600',
  })

  return new NextResponse(object.body, { headers })
}
