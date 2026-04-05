'use client'
export const runtime = 'edge'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Student { id: string; name: string }
interface ProblemSet { id: string; name: string }

export default function NewAssignmentPage() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [problemSets, setProblemSets] = useState<ProblemSet[]>([])
  const [form, setForm] = useState({
    title: '',
    problemSetId: '',
    studentIds: [] as string[],
    dueDate: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/students').then((r) => r.json() as Promise<Student[]>),
      fetch('/api/problem-sets').then((r) => r.json() as Promise<ProblemSet[]>),
    ]).then(([s, ps]) => {
      setStudents(s ?? [])
      setProblemSets(ps ?? [])
    })
  }, [])

  const toggleStudent = (id: string) => {
    setForm((f) => ({
      ...f,
      studentIds: f.studentIds.includes(id)
        ? f.studentIds.filter((s) => s !== id)
        : [...f.studentIds, id],
    }))
  }

  const selectAll = () => setForm((f) => ({ ...f, studentIds: students.map((s) => s.id) }))
  const deselectAll = () => setForm((f) => ({ ...f, studentIds: [] }))

  const handleSubmit = async () => {
    if (!form.title || !form.problemSetId || !form.dueDate || form.studentIds.length === 0) {
      setError('모든 필드를 입력하고 학생을 1명 이상 선택해주세요')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json() as { error?: string }

    if (!res.ok) { setError(data.error ?? '출제 실패'); setLoading(false); return }
    router.push('/teacher/assignments')
  }

  return (
    <div>
      <div className="px-7 py-5 border-b flex items-center gap-4" style={{ borderColor: 'var(--lemma-cream-2)' }}>
        <button onClick={() => router.back()} className="text-sm px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--lemma-cream-2)', color: 'var(--lemma-ink-2)' }}>← 뒤로</button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--lemma-ink)' }}>숙제 출제</h1>
      </div>

      <div className="p-7 max-w-2xl space-y-6">
        {/* Title */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: 'var(--lemma-ink-2)' }}>숙제 제목 *</label>
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="ex) 이차방정식 연습 #4"
            className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
            style={{ borderColor: 'var(--lemma-cream-2)', background: 'white', color: 'var(--lemma-ink)' }} />
        </div>

        {/* Problem set */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: 'var(--lemma-ink-2)' }}>문제 세트 *</label>
          <select value={form.problemSetId} onChange={(e) => setForm((f) => ({ ...f, problemSetId: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
            style={{ borderColor: 'var(--lemma-cream-2)', background: 'white', color: 'var(--lemma-ink)' }}>
            <option value="">선택해주세요</option>
            {problemSets.map((ps) => <option key={ps.id} value={ps.id}>{ps.name}</option>)}
          </select>
        </div>

        {/* Due date */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: 'var(--lemma-ink-2)' }}>마감일 *</label>
          <input type="datetime-local" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
            style={{ borderColor: 'var(--lemma-cream-2)', background: 'white', color: 'var(--lemma-ink)' }} />
        </div>

        {/* Students */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold" style={{ color: 'var(--lemma-ink-2)' }}>
              대상 학생 * ({form.studentIds.length}명 선택)
            </label>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--lemma-ink-3)' }}>전체 선택</button>
              <button onClick={deselectAll} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--lemma-ink-3)' }}>전체 해제</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {students.map((s) => (
              <button key={s.id} onClick={() => toggleStudent(s.id)}
                className="px-3 py-2 rounded-xl text-sm font-medium border transition-all"
                style={{
                  background: form.studentIds.includes(s.id) ? 'var(--lemma-ink)' : 'white',
                  color: form.studentIds.includes(s.id) ? 'var(--lemma-cream)' : 'var(--lemma-ink-2)',
                  borderColor: form.studentIds.includes(s.id) ? 'var(--lemma-ink)' : 'var(--lemma-cream-2)',
                }}>
                {s.name}
              </button>
            ))}
            {students.length === 0 && (
              <p className="col-span-3 text-sm py-4 text-center" style={{ color: 'var(--lemma-ink-3)' }}>
                등록된 학생이 없어요
              </p>
            )}
          </div>
        </div>

        {error && <p className="text-sm" style={{ color: 'var(--lemma-red)' }}>{error}</p>}

        <button onClick={handleSubmit} disabled={loading}
          className="px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
          style={{ background: 'var(--lemma-gold)', color: 'var(--lemma-ink)' }}>
          {loading ? '출제 중...' : '숙제 출제'}
        </button>
      </div>
    </div>
  )
}
