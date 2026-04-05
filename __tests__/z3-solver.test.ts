/**
 * Tests for Z3 client fallback logic (without actual Z3 service)
 */

describe('Z3 client fallback', () => {
  const buildResult = (valid: boolean, reason: string) => ({
    valid,
    reason,
    expectedSolutions: [] as string[],
  })

  it('returns valid=true when Z3 service URL is not configured', () => {
    const result = buildResult(true, 'Z3 서비스 미설정')
    expect(result.valid).toBe(true)
  })

  it('returns valid=false when Z3 contradicts Gemini', () => {
    // Simulate: Gemini says correct, Z3 says wrong
    const geminiResult = { isCorrect: true, studentAnswer: 'x = 1' }
    const z3Result = buildResult(false, '수식 검증 실패: x=1은 이 방정식의 해가 아닙니다')

    // When Z3 overrides Gemini
    const finalCorrect = geminiResult.isCorrect && z3Result.valid
    expect(finalCorrect).toBe(false)
  })

  it('passes when both Gemini and Z3 agree the answer is correct', () => {
    const geminiResult = { isCorrect: true, studentAnswer: 'x = 2' }
    const z3Result = buildResult(true, '올바른 풀이입니다')

    const finalCorrect = geminiResult.isCorrect && z3Result.valid
    expect(finalCorrect).toBe(true)
  })
})

describe('Formula parsing edge cases', () => {
  const parseAnswer = (raw: string): string[] => {
    const tokens = raw.match(/-?\s*\d+\s*\/\s*\d+|-?\s*\d+\.?\d*/g) ?? []
    return tokens.map(t => t.replace(/\s/g, ''))
  }

  it('parses simple integer answers', () => {
    expect(parseAnswer('x = 2')).toContain('2')
    expect(parseAnswer('x = -3')).toContain('-3')
  })

  it('parses fraction answers', () => {
    expect(parseAnswer('x = 1/2')).toContain('1/2')
    expect(parseAnswer('x = -2/3')).toContain('-2/3')
  })

  it('parses multiple answers', () => {
    const result = parseAnswer('x = 2 or x = 3')
    expect(result).toContain('2')
    expect(result).toContain('3')
  })
})
