export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { query, queryOne, execute } from '@/lib/db'
import { hashPin } from '@/lib/crypto'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const students = await query('SELECT id, name, created_at FROM users WHERE role = ? ORDER BY name', ['student'])
  return NextResponse.json(students)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, pin } = await req.json() as { name?: string; pin?: string }
  if (!name?.trim() || !pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: '이름과 4자리 PIN이 필요합니다' }, { status: 400 })
  }

  const existing = await queryOne('SELECT id FROM users WHERE name = ?', [name.trim()])
  if (existing) {
    return NextResponse.json({ error: '이미 같은 이름의 학생이 있어요' }, { status: 409 })
  }

  const pinHash = await hashPin(pin)
  const id = crypto.randomUUID()
  await execute('INSERT INTO users (id, name, pin_hash, role) VALUES (?, ?, ?, ?)', [id, name.trim(), pinHash, 'student'])
  const student = await queryOne('SELECT id, name, created_at FROM users WHERE id = ?', [id])
  return NextResponse.json(student, { status: 201 })
}
