import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export const visionModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
export const proModel     = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

// ─── Types ────────────────────────────────────────────────────────────────

export interface GradingResult {
  isCorrect: boolean
  studentAnswer: string
  feedback: string
  confidence: number
}

export interface SimilarProblemResult {
  body: string
  answer: string
  conceptTags: string[]
}

// ─── Grade a single problem ────────────────────────────────────────────────

export async function gradeProblem(
  imageBase64: string,
  imageMimeType: string,
  problemBody: string,
  correctAnswer: string,
  solution: string | null
): Promise<GradingResult> {
  const prompt = `
당신은 수학 채점 AI입니다. 학생의 풀이 사진을 보고 정오를 판단해주세요.

문제: ${problemBody}
정답: ${correctAnswer}
${solution ? `풀이 설명: ${solution}` : ''}

다음 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{
  "isCorrect": boolean,
  "studentAnswer": "학생이 쓴 최종 답 (텍스트로)",
  "feedback": "틀렸다면 어디서 왜 틀렸는지 한국어로 2~3문장. 맞았다면 빈 문자열",
  "confidence": 0.0에서 1.0 사이 숫자
}
`.trim()

  const result = await visionModel.generateContent([
    prompt,
    { inlineData: { data: imageBase64, mimeType: imageMimeType } },
  ])

  const text = result.response.text().trim()
  // Extract JSON even if model adds markdown fences
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Gemini returned non-JSON response')

  return JSON.parse(jsonMatch[0]) as GradingResult
}

// ─── Generate similar problem ─────────────────────────────────────────────

export async function generateSimilarProblem(
  originalBody: string,
  conceptTags: string[],
  wrongReason: string
): Promise<SimilarProblemResult> {
  const prompt = `
당신은 수학 문제 출제 AI입니다.
학생이 아래 문제를 틀렸습니다. 같은 개념을 다루는 유사한 새 문제를 만들어주세요.
숫자나 조건을 살짝 바꿔서 비슷한 난이도로 만드세요.

원본 문제: ${originalBody}
개념 태그: ${conceptTags.join(', ')}
학생의 오답 이유: ${wrongReason}

다음 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{
  "body": "새 문제 본문",
  "answer": "정답",
  "conceptTags": ["태그1", "태그2"]
}
`.trim()

  const result = await proModel.generateContent(prompt)
  const text = result.response.text().trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Gemini returned non-JSON response')

  return JSON.parse(jsonMatch[0]) as SimilarProblemResult
}

// ─── Separate problems in a photo ─────────────────────────────────────────

export async function separateProblemsFromPhoto(
  imageBase64: string,
  imageMimeType: string,
  problemNumbers: number[]
): Promise<{ problemNo: number; found: boolean }[]> {
  const prompt = `
이 사진은 학생의 수학 숙제 풀이입니다.
다음 문제 번호들이 사진에 있는지 확인해주세요: ${problemNumbers.join(', ')}번

다음 JSON 형식으로만 응답해주세요:
[
  { "problemNo": 1, "found": true },
  { "problemNo": 2, "found": false }
]
`.trim()

  const result = await visionModel.generateContent([
    prompt,
    { inlineData: { data: imageBase64, mimeType: imageMimeType } },
  ])

  const text = result.response.text().trim()
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return problemNumbers.map((n) => ({ problemNo: n, found: true }))

  return JSON.parse(jsonMatch[0])
}
