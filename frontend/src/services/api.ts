// REST API client — wraps fetch calls to the FastAPI backend

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const uploadResume = async (file: File) => {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/resume/upload`, { method: 'POST', body: form })
  return res.json()
}

export const startInterview = async (profileId: string) => {
  const res = await fetch(`${BASE}/interview/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: profileId }),
  })
  return res.json()
}

export const submitAnswer = async (sessionId: string, payload: object) => {
  const res = await fetch(`${BASE}/interview/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, ...payload }),
  })
  return res.json()
}

export const getFeedback = async (sessionId: string) =>
  fetch(`${BASE}/feedback/${sessionId}`).then((r) => r.json())

export const getJobs = async (sessionId: string) =>
  fetch(`${BASE}/jobs?session_id=${sessionId}`).then((r) => r.json())
