interface VerifyRequest {
  formula: string
  studentAnswer: string
  formulas?: string[]
}

interface VerifyResult {
  valid: boolean
  reason: string
  expectedSolutions: string[]
}

export async function verifyWithZ3(req: VerifyRequest): Promise<VerifyResult> {
  const z3Url = process.env.Z3_SERVICE_URL
  if (!z3Url) {
    // Z3 not configured — skip verification
    return { valid: true, reason: 'Z3 서비스 미설정', expectedSolutions: [] }
  }

  try {
    const res = await fetch(`${z3Url}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        formula: req.formula,
        student_answer: req.studentAnswer,
        formulas: req.formulas,
        key: process.env.Z3_INTERNAL_KEY ?? '',
      }),
      signal: AbortSignal.timeout(10_000), // 10s timeout
    })

    if (!res.ok) return { valid: false, reason: 'Z3 서비스 오류', expectedSolutions: [] }

    const data = await res.json() as { valid: boolean; reason: string; expected_solutions?: string[] }
    return {
      valid: data.valid,
      reason: data.reason,
      expectedSolutions: data.expected_solutions ?? [],
    }
  } catch {
    // Z3 service unavailable — fall back gracefully
    return { valid: true, reason: 'Z3 서비스 연결 실패 (무시)', expectedSolutions: [] }
  }
}
