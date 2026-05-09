import { useNavigate } from 'react-router-dom'

const report = {
  overall: 74, role: 'Backend Engineer',
  sections: [
    { title: 'Technical knowledge', score: 78, observations: ['Strong REST API grasp', 'Good database indexing knowledge'], improvements: ['Deepen distributed systems knowledge', 'Study CAP theorem'] },
    { title: 'Communication clarity', score: 71, observations: ['Well-structured responses', 'Good use of examples'], improvements: ['Reduce filler words', 'Slow down on complex topics'] },
    { title: 'Confidence & presence', score: 68, observations: ['Clear voice throughout', 'Maintained good pace'], improvements: ['Pause before answering', 'Be more decisive'] },
  ],
  strengths: ['Solid API fundamentals', 'Structured thinking', 'Example-driven answers'],
  improvements: ['Distributed systems depth', 'Vocal confidence', 'Answer specificity'],
  coaching: 'Strong conceptual understanding overall. Focus on translating high-level design into specific trade-offs. Practice system design with explicit constraints.',
}

export default function FeedbackPage() {
  const navigate = useNavigate()
  const c = report.overall >= 75 ? { color: '#27500A', bg: '#EAF3DE' } : report.overall >= 50 ? { color: '#633806', bg: '#FAEEDA' } : { color: '#791F1F', bg: '#FCEBEB' }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ background: '#EAF3DE', color: '#27500A', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Interview complete</span>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: 8 }}>Your feedback report</h1>
          <p style={{ color: '#666' }}>{report.role}</p>
        </div>
        <div style={{ width: 100, height: 100, borderRadius: '50%', background: c.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: c.color }}>{report.overall}</span>
          <span style={{ fontSize: 11, color: c.color, fontWeight: 600 }}>/ 100</span>
        </div>
      </div>

      <div style={{ background: c.bg, borderLeft: `4px solid ${c.color}`, borderRadius: '0 12px 12px 0', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: c.color, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Coaching summary</p>
        <p style={{ fontSize: 14, lineHeight: 1.7 }}>{report.coaching}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem' }}>
          <h3 style={{ color: '#27500A', marginBottom: 10 }}>✅ Top strengths</h3>
          <ul style={{ paddingLeft: 18, fontSize: 13, color: '#444', lineHeight: 2 }}>{report.strengths.map(s => <li key={s}>{s}</li>)}</ul>
        </div>
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem' }}>
          <h3 style={{ color: '#854F0B', marginBottom: 10 }}>🎯 Priority improvements</h3>
          <ul style={{ paddingLeft: 18, fontSize: 13, color: '#444', lineHeight: 2 }}>{report.improvements.map(i => <li key={i}>{i}</li>)}</ul>
        </div>
      </div>

      {report.sections.map(s => {
        const sc = s.score >= 75 ? { color: '#27500A', bg: '#EAF3DE' } : s.score >= 50 ? { color: '#633806', bg: '#FAEEDA' } : { color: '#791F1F', bg: '#FCEBEB' }
        return (
          <div key={s.title} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3>{s.title}</h3>
              <span style={{ background: sc.bg, color: sc.color, padding: '4px 14px', borderRadius: 20, fontWeight: 700 }}>{s.score}</span>
            </div>
            <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, marginBottom: 14, overflow: 'hidden' }}>
              <div style={{ width: `${s.score}%`, height: '100%', background: sc.color, borderRadius: 3 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Observations</p>
                <ul style={{ paddingLeft: 16, fontSize: 13, color: '#444', lineHeight: 1.8 }}>{s.observations.map(o => <li key={o}>{o}</li>)}</ul>
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Improvements</p>
                <ul style={{ paddingLeft: 16, fontSize: 13, color: '#444', lineHeight: 1.8 }}>{s.improvements.map(i => <li key={i}>{i}</li>)}</ul>
              </div>
            </div>
          </div>
        )
      })}

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button onClick={() => navigate('/jobs')} style={{ background: '#6C5CE7', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>View matching jobs →</button>
        <button onClick={() => window.print()} style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', padding: '12px 28px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Export report</button>
      </div>
    </div>
  )
}
