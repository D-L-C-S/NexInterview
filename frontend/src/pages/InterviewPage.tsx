import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const QUESTIONS = [
  { id: 'q1', question: 'Design a URL shortener like bit.ly. Walk me through the backend architecture.', topic: 'System design', difficulty: 'medium' },
  { id: 'q2', question: 'What is the difference between a process and a thread?', topic: 'OS fundamentals', difficulty: 'easy' },
  { id: 'q3', question: 'Tell me about a time you debugged a difficult production issue.', topic: 'Behavioural', difficulty: 'medium' },
  { id: 'q4', question: 'How would you design a rate limiter for a public API?', topic: 'System design', difficulty: 'hard' },
]

const REASONING = [
  'Good answer — increasing difficulty to system design',
  'Solid fundamentals — continuing at current level',
  'Strong response — moving to advanced topics',
]

export default function InterviewPage() {
  const navigate = useNavigate()
  const [qIndex, setQIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [scores, setScores] = useState({ technical: 0, communication: 0, confidence: 0 })
  const [reasoning, setReasoning] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const current = QUESTIONS[qIndex]

  const handleSubmit = async () => {
    if (!answer.trim()) return
    setSubmitting(true)
    await new Promise(r => setTimeout(r, 1000))
    setScores({ technical: Math.min(100, scores.technical + 18), communication: Math.min(100, scores.communication + 14), confidence: Math.min(100, scores.confidence + 16) })
    setReasoning(REASONING[qIndex % REASONING.length])
    setAnswer('')
    if (qIndex + 1 >= QUESTIONS.length) { navigate('/feedback/mock-session-123'); return }
    setQIndex(i => i + 1)
    setSubmitting(false)
  }

  const ScoreBar = ({ label, value }: { label: string; value: number }) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: '#555' }}>{label}</span>
        <span style={{ fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: '#6C5CE7', borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr 260px', gap: '1.5rem' }}>
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span style={{ background: '#f0f0f0', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Q{qIndex + 1} of {QUESTIONS.length}</span>
          <span style={{ background: '#EEF0FF', color: '#4834D4', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{current.topic}</span>
          <span style={{ background: current.difficulty === 'hard' ? '#FCEBEB' : current.difficulty === 'medium' ? '#FAEEDA' : '#EAF3DE', color: current.difficulty === 'hard' ? '#791F1F' : current.difficulty === 'medium' ? '#633806' : '#27500A', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{current.difficulty}</span>
        </div>

        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: 17, lineHeight: 1.7 }}>{current.question}</p>
        </div>

        {reasoning && (
          <div style={{ background: '#EEF0FF', borderLeft: '3px solid #6C5CE7', padding: '10px 14px', borderRadius: '0 8px 8px 0', marginBottom: '1rem', fontSize: 13, color: '#4834D4', fontStyle: 'italic' }}>
            🤖 Agent: {reasoning}
          </div>
        )}

        <textarea rows={7} value={answer} onChange={e => setAnswer(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit() }}
          placeholder="Type your answer here… (Cmd+Enter to submit)"
          style={{ width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8, fontSize: 15, fontFamily: 'inherit', resize: 'vertical', outline: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
          <button onClick={handleSubmit} disabled={!answer.trim() || submitting}
            style={{ background: '#6C5CE7', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
            {submitting ? 'Evaluating…' : qIndex + 1 >= QUESTIONS.length ? 'Finish interview →' : 'Submit answer →'}
          </button>
        </div>
      </div>

      <div style={{ position: 'sticky', top: '1rem' }}>
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: 14, fontSize: '1rem' }}>Live scores</h3>
          <ScoreBar label="Technical" value={scores.technical} />
          <ScoreBar label="Communication" value={scores.communication} />
          <ScoreBar label="Confidence" value={scores.confidence} />
        </div>
        <div style={{ background: '#fafaff', border: '1px solid #e0e0ff', borderRadius: 12, padding: '1rem' }}>
          <p style={{ fontSize: 12, color: '#6C5CE7', fontWeight: 600, marginBottom: 6 }}>Tips</p>
          <ul style={{ fontSize: 13, color: '#555', paddingLeft: 16, lineHeight: 1.8 }}>
            <li>Use Situation → Action → Result</li>
            <li>State trade-offs for design questions</li>
            <li>It's OK to pause before answering</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
