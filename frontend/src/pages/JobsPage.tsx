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
    getJobRecommendations(sessionId)
      .then(setJobs)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load job recommendations'))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
        <div className="spinner" />
        <h2 style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>Finding matching jobs…</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Searching job boards based on your resume profile.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
        <p style={{ color: 'var(--red-text)', marginBottom: 16 }}>{error}</p>
        <button onClick={() => navigate('/upload')} className="btn btn-primary">Start a new interview</button>
      </div>
    )
  }

  return (
    <div className="page-md fade-up">
      <div style={{ paddingTop: '1rem', marginBottom: '1.5rem' }}>
        <span className="badge badge-green" style={{ marginBottom: 10, display: 'inline-flex' }}>
          {jobs.length} jobs found
        </span>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 4, color: 'var(--text)' }}>Recommended jobs</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Matched to your resume profile</p>
      </div>

      {jobs.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <p style={{ fontSize: 14 }}>No job listings found. Try again later — job board APIs may be rate-limited.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.75rem' }}>
          {jobs.map((job, i) => (
            <div key={`${job.company}-${job.title}`} className="card" style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '1rem', alignItems: 'center' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: i === 0 ? 'var(--primary-light)' : 'var(--bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 14,
                color: i === 0 ? 'var(--primary)' : 'var(--text-secondary)',
              }}>
                {i + 1}
              </div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 2, color: 'var(--text)' }}>{job.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  {job.company}{job.location ? ` · ${job.location}` : ''}
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.6 }}>{job.match_reason}</p>
              </div>
              <a href={job.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ flexShrink: 0 }}>
                Apply →
              </a>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={() => navigate(`/feedback/${sessionId}`)} className="btn btn-ghost btn-lg">← Back to feedback</button>
        <button onClick={() => navigate('/upload')} className="btn btn-primary btn-lg">New interview</button>
      </div>
    </div>
  )
}
