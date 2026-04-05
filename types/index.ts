export type Role = 'admin' | 'student'

export interface User {
  id: string
  name: string
  role: Role
  created_at: string
}

export interface Problem {
  id: string
  title: string
  body: string
  image_url: string | null
  answer: string
  solution: string | null
  concept_tags: string[]
  z3_formula: string | null
  created_by: string
  created_at: string
}

export interface ProblemSet {
  id: string
  name: string
  problem_ids: string[]
  created_by: string
  created_at: string
}

export interface Assignment {
  id: string
  problem_set_id: string
  student_ids: string[]
  due_date: string
  title: string
  created_by: string
  created_at: string
  // joined
  problem_set?: ProblemSet
  my_submission?: Submission
}

export type SubmissionStatus = 'pending' | 'processing' | 'done' | 'error'

export interface Submission {
  id: string
  assignment_id: string
  student_id: string
  photo_urls: string[]
  status: SubmissionStatus
  total_score: number | null
  submitted_at: string
  // joined
  results?: SubmissionResult[]
}

export interface SubmissionResult {
  id: string
  submission_id: string
  problem_id: string
  is_correct: boolean
  student_answer: string | null
  ai_feedback: string | null
  z3_verified: boolean | null
  similar_problem_id: string | null
  created_at: string
  // joined
  problem?: Problem
  similar_problem?: SimilarProblem
}

export interface SimilarProblem {
  id: string
  original_problem_id: string
  body: string
  answer: string
  concept_tags: string[]
  generated_at: string
}

// Dashboard types
export interface DashboardSummary {
  totalStudents: number
  submittedToday: number
  avgScore: number
  pendingCount: number
}

export interface StudentStat {
  student: User
  scoreHistory: { date: string; score: number; total: number }[]
  conceptStats: { tag: string; correct: number; total: number }[]
  recentSubmissions: Submission[]
}
