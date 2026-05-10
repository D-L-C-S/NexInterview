import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getFeedback } from '../services/api'
import type { FeedbackReportResponse } from '../types'

export default function FeedbackPage() {
  const navigate = useNavigate()
  const { sessionId } = useParams<{ sessionId: string }>()
  const [report, setReport] = useState<FeedbackReportResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return
    setLoading(true)
    getFeedback(sessionId)
      .then(setReport)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load feedback')
      })
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '4rem 2rem', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🤖</div>
        <h2 style={{ marginBottom: 8 }}>Generating your feedback report…</h2>
        <p style={{ color: '#666' }}>Our AI coach is analysing your responses. This may take a moment.</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '4rem 2rem', textAlign: 'center' }}>
        <p style={{ color: '#D63031', marginBottom: 16 }}>{error ?? 'Failed to load feedback'}</p>
        <button onClick={() => navigate('/upload')} style={{ background: '#6C5CE7', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          Start a new interview
        </button>
      </div>
    )
  }

  const overallScore = Math.round(
    ((report.avg_scores.technical_score + report.avg_scores.depth_score +
      report.avg_scores.confidence_score + report.avg_scores.engagement_score) / 4) * 100
  )
  const c = overallScore >= 75
    ? { color: '#27500A', bg: '#EAF3DE' }
    : overallScore >= 50
      ? { color: '#633806', bg: '#FAEEDA' }
      : { color: '#791F1F', bg: '#FCEBEB' }

  const scoreItems = [
    { label: 'Technical', value: report.avg_scores.technical_score },
    { label: 'Depth', value: report.avg_scores.depth_score },
    { label: 'Confidence', value: report.avg_scores.confidence_score },
    { label: 'Engagement', value: report.avg_scores.engagement_score },
  ]

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ background: '#EAF3DE', color: '#27500A', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Interview complete</span>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: 8 }}>Your feedback report</h1>
        </div>
        <div style={{ width: 100, height: 100, borderRadius: '50%', background: c.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: c.color }}>{overallScore}</span>
          <span style={{ fontSize: 11, color: c.color, fontWeight: 600 }}>/ 100</span>
        </div>
      </div>

      {/* Coaching summary */}
      <div style={{ background: c.bg, borderLeft: `4px solid ${c.color}`, borderRadius: '0 12px 12px 0', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: c.color, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Coaching summary</p>
        <p style={{ fontSize: 14, lineHeight: 1.7 }}>{report.overall_summary}</p>
      </div>

      {/* Score bars */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {scoreItems.map(s => {
          const pct = Math.round(s.value * 100)
          const sc = pct >= 75 ? { color: '#27500A', bg: '#EAF3DE' } : pct >= 50 ? { color: '#633806', bg: '#FAEEDA' } : { color: '#791F1F', bg: '#FCEBEB' }
          return (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 600 }}>{s.label}</p>
              <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 20, fontWeight: 700, fontSize: 18, background: sc.bg, color: sc.color }}>
                {pct}%
              </span>
              <div style={{ height: 4, background: '#f0f0f0', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: sc.color, borderRadius: 2 }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Strengths + Improvements */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem' }}>
          <h3 style={{ color: '#27500A', marginBottom: 10 }}>✅ Behavioural insights</h3>
          <ul style={{ paddingLeft: 18, fontSize: 13, color: '#444', lineHeight: 2, margin: 0 }}>
            {report.behavioural_insights.map(s => <li key={s}>{s}</li>)}
          </ul>
        </div>
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem' }}>
          <h3 style={{ color: '#854F0B', marginBottom: 10 }}>🎯 Technical gaps</h3>
          <ul style={{ paddingLeft: 18, fontSize: 13, color: '#444', lineHeight: 2, margin: 0 }}>
            {report.technical_gaps.map(g => <li key={g}>{g}</li>)}
          </ul>
        </div>
      </div>

      {/* Communication tips */}
      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: 10 }}>💬 Communication tips</h3>
        <ul style={{ paddingLeft: 18, fontSize: 13, color: '#444', lineHeight: 2, margin: 0 }}>
          {report.communication_tips.map(t => <li key={t}>{t}</li>)}
        </ul>
      </div>

      {/* Next steps */}
      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: 10 }}>📋 Next steps</h3>
        <ol style={{ paddingLeft: 18, fontSize: 13, color: '#444', lineHeight: 2, margin: 0 }}>
          {report.next_steps.map(s => <li key={s}>{s}</li>)}
        </ol>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button
          onClick={() => navigate(`/jobs?session=${sessionId}`)}
          style={{ background: '#6C5CE7', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}
        >
          View matching jobs →
        </button>
        <button
          onClick={() => window.print()}
          style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', padding: '12px 28px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}
        >
          Export report
        </button>
        <button
          onClick={() => navigate('/upload')}
          style={{ background: '#fff', border: '1px solid #ddd', padding: '12px 28px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', color: '#666' }}
        >
          New interview
        </button>
      </div>
    </div>
  )
}
