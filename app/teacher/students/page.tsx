export const runtime = 'edge'

import { auth } from '@/auth'
import { query } from '@/lib/db'
import Link from 'next/link'
import AddStudentButton from './AddStudentButton'

export default async function StudentsPage() {
  await auth()

  const [students, submissions] = await Promise.all([
    query<{ id: string; name: string; created_at: string }>(
      `SELECT id, name, created_at FROM users WHERE role = 'student' ORDER BY name`
    ),
    query<{ student_id: string; status: string; total_score: number | null }>(
      `SELECT student_id, status, total_score FROM submissions`
    ),
  ])

  return (
    <div>
      <div className="px-7 py-5 border-b flex justify-between items-center" style={{ borderColor: 'var(--lemma-cream-2)' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--lemma-ink)' }}>학생 목록</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--lemma-ink-3)' }}>총 {students?.length ?? 0}명</p>
        </div>
        <AddStudentButton />
      </div>

      <div className="p-7">
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'white', borderColor: 'var(--lemma-cream-2)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--lemma-cream-2)' }}>
                {['이름', '총 제출', '평균 점수', '가입일', ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--lemma-ink-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students?.map((s) => {
                const mySubs = submissions?.filter(sub => sub.student_id === s.id && sub.status === 'done') ?? []
                const avg = mySubs.length > 0
                  ? Math.round(mySubs.reduce((a, sub) => a + (sub.total_score ?? 0), 0) / mySubs.length)
                  : null
                return (
                  <tr key={s.id} className="hover:bg-stone-50 transition-colors" style={{ borderBottom: '1px solid oklch(95% 0.005 90)' }}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                          style={{ background: 'oklch(88% 0.08 75)', color: 'var(--lemma-ink)' }}>
                          {s.name[0]}
                        </div>
                        <span className="font-semibold text-sm" style={{ color: 'var(--lemma-ink)' }}>{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: 'var(--lemma-ink-2)' }}>{mySubs.length}회</td>
                    <td className="px-5 py-3">
                      {avg !== null ? (
                        <span className="font-bold" style={{ color: avg >= 80 ? 'var(--lemma-green)' : avg >= 60 ? 'var(--lemma-gold-d)' : 'var(--lemma-red)' }}>
                          {avg}점
                        </span>
                      ) : <span style={{ color: 'var(--lemma-ink-3)' }}>—</span>}
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--lemma-ink-3)' }}>
                      {new Date(s.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/teacher/students/${s.id}`}
                        className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
                        style={{ borderColor: 'var(--lemma-cream-2)', color: 'var(--lemma-ink-2)' }}>
                        상세 보기 →
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {(!students || students.length === 0) && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm" style={{ color: 'var(--lemma-ink-3)' }}>
                  등록된 학생이 없어요. 학생 추가 버튼을 눌러 시작하세요.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
