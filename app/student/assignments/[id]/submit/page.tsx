'use client'
export const runtime = 'edge'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface AssignmentData {
  id: string
  title: string
  ps_problem_ids: string | null
}

export default function SubmitPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [assignment, setAssignment] = useState<AssignmentData | null>(null)

  useEffect(() => {
    fetch(`/api/assignments/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setAssignment(data as AssignmentData) })
      .catch(() => {})
  }, [id])

  const problemCount = assignment
    ? JSON.parse(assignment.ps_problem_ids ?? '[]').length as number
    : 0

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f))
    setPhotos((prev) => [...prev, ...newFiles])
    setPreviews((prev) => [...prev, ...newPreviews])
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (photos.length === 0) { setError('사진을 1장 이상 업로드해주세요'); return }
    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('assignmentId', id)
    photos.forEach((f) => formData.append('photos', f))

    const res = await fetch('/api/submissions', { method: 'POST', body: formData })
    const data = await res.json() as { error?: string; submissionId?: string }

    if (!res.ok) {
      setError(data.error ?? '제출에 실패했어요')
      setLoading(false)
      return
    }

    router.push(`/student/assignments/${id}/feedback?submissionId=${data.submissionId}`)
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--lemma-cream)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--lemma-cream-2)', background: 'white' }}>
        <button onClick={() => router.back()} className="text-sm px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--lemma-cream-2)', color: 'var(--lemma-ink-2)' }}>
          ← 뒤로
        </button>
        <div>
          <p className="font-bold text-sm" style={{ color: 'var(--lemma-ink)' }}>
            {assignment?.title ?? '숙제 제출'}
            {problemCount > 0 ? ` — ${problemCount}문제` : ''}
          </p>
          <p className="text-xs" style={{ color: 'var(--lemma-ink-3)' }}>사진 한 장에 모든 문제가 담겨도 됩니다</p>
        </div>
      </div>

      <div className="flex-1 px-5 py-5 space-y-5">
        {/* Problem number grid */}
        {problemCount > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--lemma-ink-3)' }}>
              문제 목록 ({problemCount}문제)
            </p>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: problemCount }, (_, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--lemma-ink)', color: 'var(--lemma-cream)' }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tip */}
        <div className="px-4 py-3 rounded-xl text-xs leading-relaxed" style={{ background: 'oklch(96% 0.012 75)', borderLeft: '3px solid var(--lemma-gold)', color: 'var(--lemma-ink-2)' }}>
          💡 <strong>팁:</strong> 밝은 곳에서, 풀이 전체가 보이도록 수평으로 찍어주세요
        </div>

        {/* Photo previews */}
        {previews.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--lemma-ink-3)' }}>업로드된 사진</p>
            {previews.map((src, i) => (
              <div key={i} className="relative rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--lemma-cream-2)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`사진 ${i + 1}`} className="w-full object-cover max-h-64" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'var(--lemma-ink)', color: 'white' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload zone */}
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full py-10 rounded-2xl border-2 border-dashed flex flex-col items-center gap-2 transition-all"
          style={{ borderColor: 'var(--lemma-cream-2)', background: 'white' }}
        >
          <span className="text-3xl">📷</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--lemma-ink-2)' }}>
            {photos.length > 0 ? '사진 추가' : '사진 촬영 또는 선택'}
          </span>
          <span className="text-xs" style={{ color: 'var(--lemma-ink-3)' }}>최대 10MB · JPG, PNG, HEIC</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {error && (
          <p className="text-sm text-center font-medium" style={{ color: 'var(--lemma-red)' }}>{error}</p>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={loading || photos.length === 0}
          className="w-full py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-40"
          style={{ background: 'var(--lemma-gold)', color: 'var(--lemma-ink)' }}
        >
          {loading ? 'AI 채점 시작 중...' : '제출하기 — AI 채점 시작'}
        </button>

        <p className="text-center text-xs" style={{ color: 'var(--lemma-ink-3)' }}>
          제출 후 약 30초 이내 결과를 확인할 수 있습니다
        </p>
      </div>
    </div>
  )
}
