import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getFeedback } from '../services/api'
import type { FeedbackReportResponse } from '../types'

function scoreColor(pct: number) {
  if (pct >= 75) return { color: 'var(--green-text)', bg: 'var(--green-bg)', bar: '#22C55E' }
  if (pct >= 50) return { color: 'var(--amber-text)', bg: 'var(--amber-bg)', bar: '#F59E0B' }
  return             { color: 'var(--red-text)',   bg: 'var(--red-bg)',   bar: '#EF4444' }
}

export default function FeedbackPage() {
  const navigate = useNavigate()
  const { sessionId } = useParams<{ sessionId: string }>()
  const [report, setReport] = useState<FeedbackReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return
    getFeedback(sessionId)
      .then(setReport)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load feedback'))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
        <div className="spinner" />
        <h2 style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>Generating your report…</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Our AI coach is analysing your responses. This may take a moment.</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
        <p style={{ color: 'var(--red-text)', marginBottom: 16 }}>{error ?? 'Failed to load feedback'}</p>
        <button onClick={() => navigate('/upload')} className="btn btn-primary">Start a new interview</button>
      </div>
    )
  }

  const overallPct = Math.round(
    ((report.avg_scores.technical_score + report.avg_scores.depth_score +
      report.avg_scores.confidence_score + report.avg_scores.engagement_score) / 4) * 100
  )
  const oc = scoreColor(overallPct)

  const scoreItems = [
    { label: 'Technical',  value: report.avg_scores.technical_score },
    { label: 'Depth',      value: report.avg_scores.depth_score },
    { label: 'Confidence', value: report.avg_scores.confidence_score },
    { label: 'Engagement', value: report.avg_scores.engagement_score },
  ]

  return (
    <div className="page-md fade-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem', paddingTop: '1rem' }}>
        <div>
          <span className="badge badge-green" style={{ marginBottom: 10, display: 'inline-flex' }}>Interview complete</span>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--text)' }}>Your feedback report</h1>
        </div>
        <div style={{
          width: 90, height: 90, borderRadius: '50%', flexShrink: 0,
          background: oc.bg, border: `3px solid ${oc.bar}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: oc.color, lineHeight: 1 }}>{overallPct}</span>
          <span style={{ fontSize: 11, color: oc.color, fontWeight: 600 }}>/ 100</span>
        </div>
      </div>

      {/* Coaching summary */}
      <div style={{ background: oc.bg, borderLeft: `4px solid ${oc.bar}`, borderRadius: '0 12px 12px 0', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <p className="label" style={{ color: oc.color, marginBottom: 6 }}>Coaching summary</p>
        <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text-body)' }}>{report.overall_summary}</p>
      </div>

      {/* Score cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {scoreItems.map(s => {
          const pct = Math.round(s.value * 100)
          const sc = scoreColor(pct)
          return (
            <div key={s.label} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
              <p className="label" style={{ marginBottom: 10 }}>{s.label}</p>
              <span style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 9999, fontWeight: 800, fontSize: 17, background: sc.bg, color: sc.color }}>
                {pct}%
              </span>
              <div className="bar-track" style={{ marginTop: 12 }}>
                <div className="bar-fill" style={{ width: `${pct}%`, background: sc.bar }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Behavioural + Technical */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--green-text)', marginBottom: 12 }}>✅ Behavioural insights</h3>
          <ul style={{ paddingLeft: 18, fontSize: 13, color: 'var(--text-body)', lineHeight: 2, margin: 0 }}>
            {report.behavioural_insights.map(s => <li key={s}>{s}</li>)}
          </ul>
        </div>
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--amber-text)', marginBottom: 12 }}>🎯 Technical gaps</h3>
          <ul style={{ paddingLeft: 18, fontSize: 13, color: 'var(--text-body)', lineHeight: 2, margin: 0 }}>
            {report.technical_gaps.map(g => <li key={g}>{g}</li>)}
          </ul>
        </div>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>💬 Communication tips</h3>
        <ul style={{ paddingLeft: 18, fontSize: 13, color: 'var(--text-body)', lineHeight: 2, margin: 0 }}>
          {report.communication_tips.map(t => <li key={t}>{t}</li>)}
        </ul>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.75rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>📋 Next steps</h3>
        <ol style={{ paddingLeft: 18, fontSize: 13, color: 'var(--text-body)', lineHeight: 2, margin: 0 }}>
          {report.next_steps.map(s => <li key={s}>{s}</li>)}
        </ol>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button onClick={() => navigate(`/jobs?session=${sessionId}`)} className="btn btn-primary btn-lg">
          View matching jobs →
        </button>
        <button onClick={() => globalThis.print()} className="btn btn-ghost btn-lg">Export report</button>
        <button onClick={() => navigate('/upload')} className="btn btn-outline btn-lg">New interview</button>
      </div>
    </div>
  )
}
