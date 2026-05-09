import axios from 'axios'
import type {
  UploadResumeResponse,
  InferRolesResponse,
  StartInterviewRequest,
  StartInterviewResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  FeedbackReport,
  JobRecommendationsResponse,
} from '../types'

const BASE = '/api'

const client = axios.create({ baseURL: BASE, timeout: 30000 })

// ── Toggle this to use mock data while backend isn't ready ──
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// ── Helpers ────────────────────────────────────────────────
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ══════════════════════════════════════════════════════════
// 1. POST /upload-resume
// ══════════════════════════════════════════════════════════
export async function uploadResume(file: File): Promise<UploadResumeResponse> {
  if (USE_MOCK) {
    await delay(1200)
    return {
      session_id: 'mock-session-' + Date.now(),
      filename: file.name,
      parsed_at: new Date().toISOString(),
    }
  }
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post<UploadResumeResponse>('/upload-resume', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

// ══════════════════════════════════════════════════════════
// 2. GET /infer-roles/:session_id
// ══════════════════════════════════════════════════════════
export async function inferRoles(sessionId: string): Promise<InferRolesResponse> {
  if (USE_MOCK) {
    await delay(1800)
    return {
      session_id: sessionId,
      candidate_name: 'Anirudh Sharma',
      summary: 'Strong Python developer with 2 years of backend experience. Good foundations in system design and REST APIs. Some exposure to ML pipelines.',
      roles: [
        {
          role: 'Backend Engineer',
          confidence: 0.91,
          seniority: 'mid',
          focus_areas: ['System design', 'REST APIs', 'Database optimization', 'Python/FastAPI'],
          weak_areas: ['Distributed systems', 'Kubernetes'],
        },
        {
          role: 'Full Stack Developer',
          confidence: 0.74,
          seniority: 'mid',
          focus_areas: ['React', 'Node.js', 'REST APIs', 'SQL'],
          weak_areas: ['Frontend performance', 'CSS architecture'],
        },
        {
          role: 'ML Engineer',
          confidence: 0.58,
          seniority: 'junior',
          focus_areas: ['Python', 'Data pipelines', 'Model evaluation'],
          weak_areas: ['MLOps', 'Model serving', 'Deep learning depth'],
        },
      ],
    }
  }
  const { data } = await client.get<InferRolesResponse>(`/infer-roles/${sessionId}`)
  return data
}

// ══════════════════════════════════════════════════════════
// 3. POST /start-interview
// ══════════════════════════════════════════════════════════
export async function startInterview(
  req: StartInterviewRequest
): Promise<StartInterviewResponse> {
  if (USE_MOCK) {
    await delay(900)
    return {
      question_id: 'q-001',
      question:
        'Can you walk me through how you would design a URL shortener service like bit.ly? Focus on the backend architecture.',
      question_type: 'technical',
      difficulty: 'medium',
      topic: 'System design',
    }
  }
  const { data } = await client.post<StartInterviewResponse>('/start-interview', req)
  return data
}

// ══════════════════════════════════════════════════════════
// 4. POST /submit-answer
// ══════════════════════════════════════════════════════════
let mockQuestionIndex = 1
const MOCK_QUESTIONS = [
  {
    question_id: 'q-002',
    question: 'What is the difference between a process and a thread? When would you use one over the other?',
    question_type: 'technical' as const,
    difficulty: 'easy' as const,
    topic: 'Operating systems',
  },
  {
    question_id: 'q-003',
    question: 'Tell me about a time you had to debug a production issue under pressure. What was your approach?',
    question_type: 'behavioural' as const,
    difficulty: 'medium' as const,
    topic: 'Problem solving',
  },
  {
    question_id: 'q-004',
    question: 'How would you design a rate limiter for a public API? What algorithms would you consider?',
    question_type: 'technical' as const,
    difficulty: 'hard' as const,
    topic: 'System design',
  },
]

export async function submitAnswer(req: SubmitAnswerRequest): Promise<SubmitAnswerResponse> {
  if (USE_MOCK) {
    await delay(1400)
    const nextQ = MOCK_QUESTIONS[mockQuestionIndex % MOCK_QUESTIONS.length] ?? null
    mockQuestionIndex++
    return {
      question_id: req.question_id,
      next_question: mockQuestionIndex <= 4 ? nextQ : null,
      live_scores: {
        technical: Math.min(100, 60 + mockQuestionIndex * 7),
        communication: Math.min(100, 55 + mockQuestionIndex * 5),
        confidence: Math.min(100, 50 + mockQuestionIndex * 8),
      },
      agent_reasoning:
        mockQuestionIndex === 2
          ? 'Answer showed solid fundamentals → increasing difficulty to system design'
          : 'Candidate maintaining good pace → continuing at current level',
      answer_evaluation: {
        correctness: 72,
        depth: 65,
        feedback_hint: 'Good high-level answer. Try to mention specific trade-offs next time.',
      },
    }
  }
  const { data } = await client.post<SubmitAnswerResponse>('/submit-answer', req)
  return data
}

// ══════════════════════════════════════════════════════════
// 5. GET /feedback/:session_id
// ══════════════════════════════════════════════════════════
export async function getFeedback(sessionId: string): Promise<FeedbackReport> {
  if (USE_MOCK) {
    await delay(2000)
    return {
      session_id: sessionId,
      overall_score: 74,
      role_assessed: 'Backend Engineer',
      sections: {
        technical: {
          title: 'Technical knowledge',
          score: 78,
          observations: [
            'Strong grasp of REST API design patterns',
            'Good understanding of database indexing',
            'System design answers showed structured thinking',
          ],
          improvements: [
            'Deepen knowledge of distributed systems (CAP theorem, eventual consistency)',
            'Explore Kubernetes and container orchestration concepts',
          ],
        },
        communication: {
          title: 'Communication clarity',
          score: 71,
          observations: [
            'Responses were well-structured overall',
            'Good use of examples to support answers',
          ],
          improvements: [
            'Reduce filler words ("um", "like") — detected 14 instances',
            'Slow down slightly when explaining complex topics',
          ],
        },
        confidence: {
          title: 'Confidence & presence',
          score: 68,
          observations: [
            'Voice was clear and audible throughout',
            'Maintained reasonable eye contact',
          ],
          improvements: [
            'Pause before answering instead of rushing in — shows composure',
            'Posture dropped during harder questions — stay upright',
          ],
        },
      },
      top_strengths: [
        'Solid API and backend fundamentals',
        'Structured approach to problem-solving',
        'Good example-driven communication',
      ],
      top_improvements: [
        'Distributed systems depth',
        'Reduce hesitation under pressure',
        'Increase answer specificity with numbers/metrics',
      ],
      coaching_message:
        'Strong conceptual understanding overall. Your main gap is translating high-level design into specific trade-offs. Focus on practicing system design problems with explicit constraints (scale, latency, cost). Communication is good but vocal confidence can improve with pacing.',
      generated_at: new Date().toISOString(),
    }
  }
  const { data } = await client.get<FeedbackReport>(`/feedback/${sessionId}`)
  return data
}

// ══════════════════════════════════════════════════════════
// 6. GET /job-recommendations/:session_id
// ══════════════════════════════════════════════════════════
export async function getJobRecommendations(
  sessionId: string
): Promise<JobRecommendationsResponse> {
  if (USE_MOCK) {
    await delay(1500)
    return {
      session_id: sessionId,
      role_filter: 'Backend Engineer',
      fetched_at: new Date().toISOString(),
      listings: [
        {
          id: 'j1',
          title: 'Backend Engineer (Python)',
          company: 'Zepto',
          location: 'Bangalore, India',
          match_score: 94,
          match_reasons: ['FastAPI matches your stack', 'PostgreSQL experience', 'Startup pace fits your project history'],
          salary_range: '₹18L – ₹28L',
          apply_url: 'https://jobs.zepto.com',
          posted_at: '2 days ago',
          source: 'LinkedIn',
        },
        {
          id: 'j2',
          title: 'Software Engineer II – Platform',
          company: 'Razorpay',
          location: 'Bangalore, India',
          match_score: 88,
          match_reasons: ['Payments / fintech domain overlap', 'Python + microservices', 'Mid-level seniority match'],
          salary_range: '₹22L – ₹35L',
          apply_url: 'https://razorpay.com/jobs',
          posted_at: '5 days ago',
          source: 'LinkedIn',
        },
        {
          id: 'j3',
          title: 'Backend Developer',
          company: 'Postman',
          location: 'Bangalore, India (hybrid)',
          match_score: 82,
          match_reasons: ['REST API expertise central', 'Developer tooling experience', 'Python backend'],
          salary_range: '₹20L – ₹30L',
          apply_url: 'https://postman.com/careers',
          posted_at: '1 week ago',
          source: 'Adzuna',
        },
        {
          id: 'j4',
          title: 'Python Backend Engineer',
          company: 'Groww',
          location: 'Bangalore, India',
          match_score: 79,
          match_reasons: ['Python stack', 'High-scale systems', 'Fintech domain'],
          salary_range: '₹16L – ₹26L',
          apply_url: 'https://groww.in/careers',
          posted_at: '3 days ago',
          source: 'Indeed',
        },
      ],
    }
  }
  const { data } = await client.get<JobRecommendationsResponse>(
    `/job-recommendations/${sessionId}`
  )
  return data
}