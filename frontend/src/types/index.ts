// Shared TypeScript types mirroring backend Pydantic schemas

export interface CandidateProfile {
  skills: string[]
  experienceYears: number
  inferredRole: string
  allRoles: string[]
  focusAreas: string[]
}

export interface MultimodalScore {
  technicalScore: number
  confidenceScore: number
  communicationScore: number
  engagementScore: number
}

export interface QuestionResult {
  question: string
  transcript: string
  scores: MultimodalScore
}

export interface InterviewSession {
  id: string
  candidate: CandidateProfile
  results: QuestionResult[]
  status: 'pending' | 'active' | 'completed'
}

export interface FeedbackReport {
  sessionId: string
  technicalGaps: string[]
  communicationTips: string[]
  behaviouralInsights: string[]
  overallSummary: string
  nextSteps: string[]
  avgScores: MultimodalScore
}

export interface JobMatch {
  title: string
  company: string
  url: string
  matchScore: number
  matchReasons: string[]
}
