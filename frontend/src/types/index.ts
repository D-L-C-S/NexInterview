// ── Session ──────────────────────────────────────────────
export interface UploadResumeResponse {
  session_id: string
  filename: string
  parsed_at: string
}

// ── Roles ─────────────────────────────────────────────────
export interface JobRole {
  role: string              // e.g. "Backend Engineer"
  confidence: number        // 0-1
  focus_areas: string[]     // e.g. ["System design", "REST APIs"]
  weak_areas: string[]      // areas to probe
  seniority: string         // "junior" | "mid" | "senior"
}

export interface InferRolesResponse {
  session_id: string
  candidate_name: string
  roles: JobRole[]
  summary: string
}

// ── Interview ─────────────────────────────────────────────
export interface StartInterviewRequest {
  session_id: string
  selected_role: string
}

export interface StartInterviewResponse {
  question_id: string
  question: string
  question_type: 'technical' | 'behavioural' | 'project'
  difficulty: 'easy' | 'medium' | 'hard'
  topic: string
}

export interface LiveScores {
  technical: number       // 0-100
  communication: number   // 0-100
  confidence: number      // 0-100
}

export interface SubmitAnswerRequest {
  session_id: string
  question_id: string
  answer_text: string
  audio_confidence_score?: number   // from Whisper analysis
  video_engagement_score?: number   // from MediaPipe
}

export interface SubmitAnswerResponse {
  question_id: string
  next_question: StartInterviewResponse | null   // null = interview done
  live_scores: LiveScores
  agent_reasoning: string   // e.g. "Candidate struggled → shifting to fundamentals"
  answer_evaluation: {
    correctness: number
    depth: number
    feedback_hint: string
  }
}

// ── Feedback ──────────────────────────────────────────────
export interface FeedbackSection {
  title: string
  score: number
  observations: string[]
  improvements: string[]
}

export interface FeedbackReport {
  session_id: string
  overall_score: number
  role_assessed: string
  sections: {
    technical: FeedbackSection
    communication: FeedbackSection
    confidence: FeedbackSection
  }
  top_strengths: string[]
  top_improvements: string[]
  coaching_message: string
  generated_at: string
}

// ── Job recommendations ────────────────────────────────────
export interface JobListing {
  id: string
  title: string
  company: string
  location: string
  match_score: number     // 0-100
  match_reasons: string[]
  salary_range?: string
  apply_url: string
  posted_at: string
  source: string          // "LinkedIn" | "Adzuna" | "Indeed"
}

export interface JobRecommendationsResponse {
  session_id: string
  role_filter: string
  listings: JobListing[]
  fetched_at: string
}

// ── App state ──────────────────────────────────────────────
export type AppPage = 'upload' | 'roles' | 'interview' | 'feedback' | 'jobs'

export interface AppSession {
  sessionId: string
  selectedRole: string
  candidateName: string
}