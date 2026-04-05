export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { execute, queryOne } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { teacher_comment } = await req.json() as { teacher_comment?: string }

  if (teacher_comment === undefined) {
    return NextResponse.json({ error: 'Missing teacher_comment' }, { status: 400 })
  }

  const result = await queryOne('SELECT id FROM submission_results WHERE id = ?', [id])
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await execute(
    'UPDATE submission_results SET teacher_comment = ? WHERE id = ?',
    [teacher_comment.trim() || null, id]
  )

  return NextResponse.json({ ok: true })
}
