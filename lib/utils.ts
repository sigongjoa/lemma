import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** JSON 배열 컬럼을 안전하게 파싱 */
export function parseJsonArray<T = string>(value: string | null | undefined): T[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** 관리자 전용 API 인증 체크 */
export function requireAdmin(session: { user: { role: string } } | null): boolean {
  return session?.user.role === 'admin'
}
