'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AddStudentButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async () => {
    if (!name.trim() || !/^\d{4}$/.test(pin)) {
      setError('이름과 4자리 PIN을 입력해주세요')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pin }),
    })
    const data = await res.json() as { error?: string }

    if (!res.ok) { setError(data.error ?? '실패'); setLoading(false); return }

    setOpen(false)
    setName('')
    setPin('')
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-semibold px-4 py-2 rounded-xl"
        style={{ background: 'var(--lemma-gold)', color: 'var(--lemma-ink)' }}
      >
        + 학생 추가
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'oklch(10% 0.02 265 / 0.5)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: 'white' }}>
            <h2 className="text-lg font-bold" style={{ color: 'var(--lemma-ink)' }}>학생 추가</h2>

            {[
              { label: '이름', value: name, onChange: setName, placeholder: '홍길동' },
              { label: 'PIN (4자리)', value: pin, onChange: setPin, placeholder: '1234', maxLength: 4 },
            ].map(({ label, value, onChange, placeholder, maxLength }) => (
              <div key={label}>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--lemma-ink-2)' }}>{label}</label>
                <input
                  value={value}
                  onChange={e => onChange(e.target.value)}
                  placeholder={placeholder}
                  maxLength={maxLength}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none"
                  style={{ borderColor: 'var(--lemma-cream-2)', color: 'var(--lemma-ink)' }}
                />
              </div>
            ))}

            {error && <p className="text-xs" style={{ color: 'var(--lemma-red)' }}>{error}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium"
                style={{ borderColor: 'var(--lemma-cream-2)', color: 'var(--lemma-ink-2)' }}>
                취소
              </button>
              <button onClick={handleAdd} disabled={loading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background: 'var(--lemma-ink)', color: 'var(--lemma-cream)' }}>
                {loading ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
