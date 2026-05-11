import { useNavigate } from 'react-router-dom'

const features = [
  { icon: '📄', title: 'Resume parsing', desc: 'Upload PDF or TXT — skills, experience, and projects extracted automatically.' },
  { icon: '🎯', title: 'Role inference', desc: 'We match you to realistic job titles and tailor every question to your profile.' },
  { icon: '🤖', title: 'Adaptive questions', desc: 'Difficulty adjusts in real time based on your answers — no two sessions are the same.' },
  { icon: '📊', title: 'Live scoring', desc: 'Technical depth, communication, confidence, and engagement tracked per answer.' },
  { icon: '📝', title: 'AI coaching report', desc: 'Post-session breakdown of gaps, tips, and actionable next steps.' },
  { icon: '💼', title: 'Job matches', desc: 'Live job listings matched to your inferred role after the interview.' },
]

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div>
      <div className="hero">
        <div className="fade-up" style={{ maxWidth: 580, margin: '0 auto' }}>
          <span className="badge badge-purple" style={{ marginBottom: 20, display: 'inline-flex' }}>
            AI-powered interview prep
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.5px', marginBottom: 18, color: 'var(--text)' }}>
            Ace your next interview<br />with AI coaching
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 36 }}>
            Upload your resume, get a tailored mock interview, and receive<br />
            real-time feedback on technical skills, communication, and confidence.
          </p>
          <button onClick={() => navigate('/upload')} className="btn btn-primary btn-lg">
            Upload your resume →
          </button>
        </div>
      </div>

      <div className="page-md" style={{ padding: '3rem 1.5rem 4rem' }}>
        <p className="label" style={{ textAlign: 'center', marginBottom: 24 }}>What you get</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {features.map(({ icon, title, desc }) => (
            <div key={title} className="card card-lift fade-up" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{icon}</div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>{title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
