'use client'
export const runtime = 'edge'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CONCEPT_PRESETS = ['이차방정식', '인수분해', '근의 공식', '판별식', '완전제곱식', '일차함수', '확률', '좌표평면', '수열', '미적분']

export default function NewProblemPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    title: '',
    problemBody: '',
    answer: '',
    solution: '',
    conceptTags: [] as string[],
    z3Formula: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggleTag = (tag: string) => {
    setForm((f) => ({
      ...f,
      conceptTags: f.conceptTags.includes(tag)
        ? f.conceptTags.filter((t) => t !== tag)
        : [...f.conceptTags, tag],
    }))
  }

  const handleSubmit = async () => {
    if (!form.title || !form.problemBody || !form.answer) {
      setError('제목, 문제, 정답은 필수입니다')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/problems', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json() as { error?: string }

    if (!res.ok) { setError(data.error ?? '등록 실패'); setLoading(false); return }
    router.push('/teacher/problems')
  }

  return (
    <div>
      <div className="px-7 py-5 border-b flex items-center gap-4" style={{ borderColor: 'var(--lemma-cream-2)' }}>
        <button onClick={() => router.back()} className="text-sm px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--lemma-cream-2)', color: 'var(--lemma-ink-2)' }}>← 뒤로</button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--lemma-ink)' }}>문제 등록</h1>
      </div>

      <div className="p-7 max-w-2xl space-y-5">
        {[
          { label: '제목 *', key: 'title', placeholder: 'ex) 이차방정식 근의 공식 #1' },
          { label: '문제 본문 *', key: 'problemBody', placeholder: '2x² + 3x - 2 = 0의 근을 구하시오', textarea: true },
          { label: '정답 *', key: 'answer', placeholder: 'x = 1/2 또는 x = -2' },
          { label: '풀이 설명', key: 'solution', placeholder: '근의 공식 x = (-b ± √(b²-4ac)) / 2a 를 적용...', textarea: true },
          { label: 'Z3 수식 (선택)', key: 'z3Formula', placeholder: '2*x**2 + 3*x - 2 == 0' },
        ].map(({ label, key, placeholder, textarea }) => (
          <div key={key}>
            <label className="block text-xs font-bold mb-2" style={{ color: 'var(--lemma-ink-2)' }}>{label}</label>
            {textarea ? (
              <textarea
                value={form[key as keyof typeof form] as string}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border text-sm resize-none outline-none"
                style={{ borderColor: 'var(--lemma-cream-2)', background: 'white', color: 'var(--lemma-ink)' }}
              />
            ) : (
              <input
                value={form[key as keyof typeof form] as string}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                style={{ borderColor: 'var(--lemma-cream-2)', background: 'white', color: 'var(--lemma-ink)' }}
              />
            )}
          </div>
        ))}

        {/* Concept tags */}
        <div>
          <label className="block text-xs font-bold mb-2" style={{ color: 'var(--lemma-ink-2)' }}>개념 태그</label>
          <div className="flex flex-wrap gap-2">
            {CONCEPT_PRESETS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="text-xs px-3 py-1.5 rounded-full border transition-all"
                style={{
                  background: form.conceptTags.includes(tag) ? 'var(--lemma-ink)' : 'white',
                  color: form.conceptTags.includes(tag) ? 'var(--lemma-cream)' : 'var(--lemma-ink-2)',
                  borderColor: form.conceptTags.includes(tag) ? 'var(--lemma-ink)' : 'var(--lemma-cream-2)',
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm" style={{ color: 'var(--lemma-red)' }}>{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
          style={{ background: 'var(--lemma-ink)', color: 'var(--lemma-cream)' }}
        >
          {loading ? '등록 중...' : '문제 등록'}
        </button>
      </div>
    </div>
  )
}
