/**
 * Unit tests for authentication logic
 */

describe('PIN validation', () => {
  const validatePin = (pin: string): boolean => {
    return /^\d{4}$/.test(pin)
  }

  it('accepts valid 4-digit PIN', () => {
    expect(validatePin('1234')).toBe(true)
    expect(validatePin('0000')).toBe(true)
    expect(validatePin('9999')).toBe(true)
  })

  it('rejects PINs that are not 4 digits', () => {
    expect(validatePin('123')).toBe(false)
    expect(validatePin('12345')).toBe(false)
    expect(validatePin('')).toBe(false)
    expect(validatePin('abcd')).toBe(false)
    expect(validatePin('12ab')).toBe(false)
  })
})

describe('Name validation', () => {
  const validateName = (name: string): boolean => {
    return name.trim().length >= 2
  }

  it('accepts valid names', () => {
    expect(validateName('홍길동')).toBe(true)
    expect(validateName('김민준')).toBe(true)
    expect(validateName('AB')).toBe(true)
  })

  it('rejects empty or too short names', () => {
    expect(validateName('')).toBe(false)
    expect(validateName(' ')).toBe(false)
    expect(validateName('A')).toBe(false)
  })
})

describe('Role-based redirect logic', () => {
  const getRedirectPath = (role: string): string => {
    return role === 'admin' ? '/teacher' : '/student'
  }

  it('redirects admin to /teacher', () => {
    expect(getRedirectPath('admin')).toBe('/teacher')
  })

  it('redirects student to /student', () => {
    expect(getRedirectPath('student')).toBe('/student')
  })
})
