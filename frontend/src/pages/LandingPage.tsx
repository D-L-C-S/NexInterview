import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '5rem 2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem' }}>
        NexInterview
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '2.5rem', lineHeight: 1.7 }}>
        AI-powered mock interviews tailored to your resume.<br />
        Get real-time feedback on technical skills, communication, and confidence.
      </p>
      <button
        onClick={() => navigate('/upload')}
        style={{
          background: '#6C5CE7', color: '#fff', border: 'none',
          padding: '14px 36px', borderRadius: 10, fontSize: '1rem',
          fontWeight: 600, cursor: 'pointer',
        }}
      >
        Get started →
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginTop: '4rem', textAlign: 'left' }}>
        {[
          ['🎯', 'Role inference', 'Upload your resume and we infer the top roles you can realistically land.'],
          ['🤖', 'Adaptive interview', 'Questions adjust in real-time based on your answers and confidence.'],
          ['📊', 'Full feedback', 'Get scored on technical depth, communication clarity, and confidence.'],
        ].map(([icon, title, desc]) => (
          <div key={title} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
            <h3 style={{ marginBottom: 6 }}>{title}</h3>
            <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
