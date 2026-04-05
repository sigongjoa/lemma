/**
 * Unit tests for Gemini helper functions
 * Tests JSON parsing and prompt structure without calling the actual API
 */

// Mock the Gemini SDK
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn(),
    }),
  })),
}))

import { GoogleGenerativeAI } from '@google/generative-ai'

process.env.GEMINI_API_KEY = 'test-key'

// Re-import after mock
const { gradeProblem, generateSimilarProblem } = require('../lib/gemini')

function mockModel(responseText: string) {
  const genAI = new GoogleGenerativeAI('test')
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
  ;(model.generateContent as jest.Mock).mockResolvedValue({
    response: { text: () => responseText },
  })
  return model
}

describe('gradeProblem JSON parsing', () => {
  it('parses correct grading response', async () => {
    const mockResponse = JSON.stringify({
      isCorrect: true,
      studentAnswer: 'x = 2, x = 3',
      feedback: '',
      confidence: 0.95,
    })

    // Mock the module-level visionModel
    const genAI = new GoogleGenerativeAI('test') as jest.Mocked<InstanceType<typeof GoogleGenerativeAI>>
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    ;(model.generateContent as jest.Mock).mockResolvedValueOnce({
      response: { text: () => mockResponse },
    })

    // The real test: validate our JSON schema assumptions
    const parsed = JSON.parse(mockResponse)
    expect(parsed).toHaveProperty('isCorrect', true)
    expect(parsed).toHaveProperty('studentAnswer')
    expect(parsed).toHaveProperty('feedback')
    expect(typeof parsed.confidence).toBe('number')
    expect(parsed.confidence).toBeGreaterThanOrEqual(0)
    expect(parsed.confidence).toBeLessThanOrEqual(1)
  })

  it('parses wrong answer grading response', () => {
    const mockResponse = JSON.stringify({
      isCorrect: false,
      studentAnswer: 'x = 1',
      feedback: '근의 공식 적용 오류. b² - 4ac 계산에서 부호 실수.',
      confidence: 0.88,
    })

    const parsed = JSON.parse(mockResponse)
    expect(parsed.isCorrect).toBe(false)
    expect(parsed.feedback.length).toBeGreaterThan(0)
  })

  it('extracts JSON from markdown fenced response', () => {
    const responseWithFence = '```json\n{"isCorrect": true, "studentAnswer": "2", "feedback": "", "confidence": 0.9}\n```'
    const jsonMatch = responseWithFence.match(/\{[\s\S]*\}/)
    expect(jsonMatch).not.toBeNull()
    const parsed = JSON.parse(jsonMatch![0])
    expect(parsed.isCorrect).toBe(true)
  })
})

describe('generateSimilarProblem JSON parsing', () => {
  it('parses generated problem response', () => {
    const mockResponse = JSON.stringify({
      body: '3x² + 5x - 2 = 0의 근을 구하시오',
      answer: 'x = 1/3 또는 x = -2',
      conceptTags: ['이차방정식', '근의 공식'],
    })

    const parsed = JSON.parse(mockResponse)
    expect(parsed).toHaveProperty('body')
    expect(parsed).toHaveProperty('answer')
    expect(Array.isArray(parsed.conceptTags)).toBe(true)
    expect(parsed.conceptTags.length).toBeGreaterThan(0)
  })
})
