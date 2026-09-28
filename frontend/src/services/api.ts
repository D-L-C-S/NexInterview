import axios from 'axios'
import type {
  CandidateProfileResponse,
  StartInterviewRequest,
  StartInterviewResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  FeedbackReportResponse,
  JobMatchResponse,
  InterviewSessionResponse,
} from '../types'

const BASE = '/api'

const client = axios.create({ baseURL: BASE, timeout: 30_000 })

// Surface FastAPI's `detail` message instead of axios's generic "status code 500"
client.interceptors.response.use(undefined, (error) => {
  const detail = error?.response?.data?.detail
  if (detail) {
    error.message = typeof detail === 'string' ? detail : JSON.stringify(detail)
  } else if (error?.response?.status >= 500) {
    // A bare 5xx with no FastAPI body comes from Vite's proxy failing to reach the backend
    error.message = 'Backend is not reachable — is the uvicorn server running on port 8000?'
  }
  return Promise.reject(error)
})

// ══════════════════════════════════════════════════════════════════════════════
// 1. POST /resume/upload — parse a resume and return a CandidateProfile
// ══════════════════════════════════════════════════════════════════════════════
export async function uploadResume(file: File): Promise<CandidateProfileResponse> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post<CandidateProfileResponse>('/resume/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60_000,
  })
  return data
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. POST /interview/start — begin a 5-question interview session
// ══════════════════════════════════════════════════════════════════════════════
export async function startInterview(
  req: StartInterviewRequest
): Promise<StartInterviewResponse> {
  const { data } = await client.post<StartInterviewResponse>('/interview/start', req)
  return data
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. POST /interview/answer — submit an answer, get scores + next question
// ══════════════════════════════════════════════════════════════════════════════
export async function submitAnswer(
  req: SubmitAnswerRequest
): Promise<SubmitAnswerResponse> {
  const { data } = await client.post<SubmitAnswerResponse>('/interview/answer', req)
  return data
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. GET /interview/{session_id} — fetch full session state
// ══════════════════════════════════════════════════════════════════════════════
export async function getSession(
  sessionId: string
): Promise<InterviewSessionResponse> {
  const { data } = await client.get<InterviewSessionResponse>(`/interview/${sessionId}`)
  return data
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. GET /feedback/{session_id} — generate and return coaching report
// ══════════════════════════════════════════════════════════════════════════════
export async function getFeedback(
  sessionId: string
): Promise<FeedbackReportResponse> {
  const { data } = await client.get<FeedbackReportResponse>(`/feedback/${sessionId}`)
  return data
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. GET /jobs?session_id=... — ranked job recommendations
// ══════════════════════════════════════════════════════════════════════════════
export async function getJobRecommendations(
  sessionId: string
): Promise<JobMatchResponse[]> {
  const { data } = await client.get<JobMatchResponse[]>('/jobs', {
    params: { session_id: sessionId },
  })
  return data
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. GET /health — liveness check
// ══════════════════════════════════════════════════════════════════════════════
export async function healthCheck(): Promise<{ status: string; version: string }> {
  const { data } = await client.get<{ status: string; version: string }>('/health')
  return data
}