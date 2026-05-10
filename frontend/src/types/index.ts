// ── Resume (matches backend CandidateProfileResponse) ────────────────────────
export interface CandidateProfileResponse {
  profile_id: string
  name: string
  skills: string[]
  experience_years: number
  inferred_role: string
  all_roles: string[]
  focus_areas: string[]
}

// ── Interview (matches backend schemas) ──────────────────────────────────────
export type Difficulty = 'easy' | 'medium' | 'hard'
export type Category = 'technical' | 'behavioural' | 'system_design'

export interface QuestionOut {
  id: string
  text: string
  category: Category
  difficulty: Difficulty
}

export interface StartInterviewRequest {
  profile_id: string
}

export interface StartInterviewResponse {
  session_id: string
  question: QuestionOut
}

export interface SubmitAnswerRequest {
  session_id: string
  question_id: string
  answer_text: string
  confidence_score?: number | null
  engagement_score?: number | null
}

export interface MultimodalScores {
  technical_score: number
  depth_score: number
  confidence_score: number
  engagement_score: number
}

export interface SubmitAnswerResponse {
  scores: MultimodalScores
  feedback_snippet: string
  next_question: QuestionOut | null
  session_complete: boolean
}

export interface QuestionResult {
  question: QuestionOut
  answer_text: string
  scores: MultimodalScores
}

export interface CandidateSummary {
  inferred_role: string
  skills: string[]
  focus_areas: string[]
}

export interface InterviewSessionResponse {
  session_id: string
  status: 'active' | 'completed'
  candidate: CandidateSummary
  results: QuestionResult[]
  questions_asked: number
  questions_total: number
}

// ── Feedback (matches backend FeedbackReportResponse) ────────────────────────
export interface FeedbackReportResponse {
  session_id: string
  avg_scores: MultimodalScores
  technical_gaps: string[]
  communication_tips: string[]
  behavioural_insights: string[]
  overall_summary: string
  next_steps: string[]
}

// ── Jobs (matches backend JobMatchResponse) ──────────────────────────────────
export interface JobMatchResponse {
  title: string
  company: string
  location: string
  url: string
  match_reason: string
}

// ── App state ────────────────────────────────────────────────────────────────
export type AppPage = 'upload' | 'interview' | 'feedback' | 'jobs'

export interface AppSession {
  profileId: string
  sessionId: string
  candidateName: string
  inferredRole: string
}