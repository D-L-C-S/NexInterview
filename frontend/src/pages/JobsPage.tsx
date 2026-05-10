import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getJobRecommendations } from '../services/api'
import type { JobMatchResponse } from '../types'

export default function JobsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session') ?? ''
  const [jobs, setJobs] = useState<JobMatchResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setLoading(false)
      setError('No session ID provided. Go back and complete an interview first.')
      return
    }
    setLoading(true)
    getJobRecommendations(sessionId)
      .then(setJobs)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load job recommendations')
      })
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '4rem 2rem', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
        <h2 style={{ marginBottom: 8 }}>Finding matching jobs…</h2>
        <p style={{ color: '#666' }}>Searching job boards based on your resume profile.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '4rem 2rem', textAlign: 'center' }}>
        <p style={{ color: '#D63031', marginBottom: 16 }}>{error}</p>
        <button onClick={() => navigate('/upload')} style={{ background: '#6C5CE7', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          Start a new interview
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <span style={{ background: '#EAF3DE', color: '#27500A', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
        {jobs.length} jobs found
      </span>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0 4px' }}>Recommended jobs</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>Matched to your resume profile</p>

      {jobs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
          <p>No job listings found. Try again later — job board APIs may be rate-limited.</p>
        </div>
      ) : (
        jobs.map((job, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '1rem', alignItems: 'start' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: i === 0 ? '#EEF0FF' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: i === 0 ? '#6C5CE7' : '#888' }}>
              {i + 1}
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>{job.title}</h3>
              <p style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>
                {job.company}{job.location ? ` · ${job.location}` : ''}
              </p>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 4 }}>{job.match_reason}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ background: '#6C5CE7', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
              >
                Apply →
              </a>
            </div>
          </div>
        ))
      )}

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
        <button
          onClick={() => navigate(`/feedback/${sessionId}`)}
          style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', padding: '12px 28px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}
        >
          ← Back to feedback
        </button>
        <button
          onClick={() => navigate('/upload')}
          style={{ background: '#6C5CE7', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}
        >
          New interview
        </button>
      </div>
    </div>
  )
}
