'use client'
export const runtime = 'edge'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Problem { id: string; title: string; concept_tags: string[] }

export default function NewProblemSetPage() {
  const router = useRouter()
  const [problems, setProblems] = useState<Problem[]>([])
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/problems').then(r => r.json() as Promise<Problem[]>).then(setProblems)
  }, [])

  const toggle = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])

  const handleSubmit = async () => {
    if (!name || selected.length === 0) { setError('이름과 문제를 선택해주세요'); return }
    setLoading(true)
    const res = await fetch('/api/problem-sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, problemIds: selected }),
    })
    if (!res.ok) { const d = await res.json() as { error?: string }; setError(d.error ?? '실패'); setLoading(false); return }
    router.push('/teacher/assignments/new')
  }

  return (
    <div>
      <div className="px-7 py-5 border-b flex items-center gap-4" style={{ borderColor: 'var(--lemma-cream-2)' }}>
        <button onClick={() => router.back()} className="text-sm px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--lemma-cream-2)', color: 'var(--lemma-ink-2)' }}>← 뒤로</button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--lemma-ink)' }}>문제 세트 만들기</h1>
      </div>

      <div className="p-7 max-w-2xl space-y-5">
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: 'var(--lemma-ink-2)' }}>세트 이름 *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="ex) 이차방정식 10문제 세트"
            className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
            style={{ borderColor: 'var(--lemma-cream-2)', background: 'white', color: 'var(--lemma-ink)' }} />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold" style={{ color: 'var(--lemma-ink-2)' }}>
              문제 선택 * ({selected.length}개)
            </label>
          </div>
          <div className="space-y-2">
            {problems.map(p => (
              <button key={p.id} onClick={() => toggle(p.id)}
                className="w-full text-left px-4 py-3 rounded-xl border flex items-center justify-between transition-all"
                style={{
                  background: selected.includes(p.id) ? 'oklch(96% 0.015 265)' : 'white',
                  borderColor: selected.includes(p.id) ? 'var(--lemma-ink)' : 'var(--lemma-cream-2)',
                }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--lemma-ink)' }}>{p.title}</p>
                  <div className="flex gap-1 mt-1">
                    {p.concept_tags.map(t => (
                      <span key={t} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--lemma-cream-2)', color: 'var(--lemma-ink-3)' }}>{t}</span>
                    ))}
                  </div>
                </div>
                {selected.includes(p.id) && <span style={{ color: 'var(--lemma-ink)' }}>✓</span>}
              </button>
            ))}
            {problems.length === 0 && (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--lemma-ink-3)' }}>
                등록된 문제가 없어요.{' '}
                <a href="/teacher/problems/new" style={{ color: 'var(--lemma-gold-d)', textDecoration: 'underline' }}>문제 먼저 등록하기</a>
              </p>
            )}
          </div>
        </div>

        {error && <p className="text-sm" style={{ color: 'var(--lemma-red)' }}>{error}</p>}

        <button onClick={handleSubmit} disabled={loading}
          className="px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
          style={{ background: 'var(--lemma-gold)', color: 'var(--lemma-ink)' }}>
          {loading ? '생성 중...' : '세트 만들기'}
        </button>
      </div>
    </div>
  )
}
