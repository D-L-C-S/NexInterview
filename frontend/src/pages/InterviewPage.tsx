import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { submitAnswer } from '../services/api'
import useAudio from '../hooks/useAudio'
import useVideo from '../hooks/useVideo'
import type { QuestionOut, MultimodalScores } from '../types'

const difficultyStyle: Record<string, { bg: string; color: string }> = {
  hard:   { bg: 'var(--red-bg)',   color: 'var(--red-text)' },
  medium: { bg: 'var(--amber-bg)', color: 'var(--amber-text)' },
  easy:   { bg: 'var(--green-bg)', color: 'var(--green-text)' },
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100)
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{pct}%</span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function InterviewPage() {
  const navigate = useNavigate()
  const { sessionId } = useParams<{ sessionId: string }>()
  const location = useLocation()
  const videoRef = useRef<HTMLVideoElement>(null)

  const state = location.state as { question?: QuestionOut; candidateName?: string; inferredRole?: string } | null

  const [currentQuestion, setCurrentQuestion] = useState<QuestionOut | null>(state?.question ?? null)
  const [answer, setAnswer] = useState('')
  const [questionNumber, setQuestionNumber] = useState(1)
  const [totalQuestions] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedbackSnippet, setFeedbackSnippet] = useState('')
  const [scores, setScores] = useState<MultimodalScores>({ technical_score: 0, depth_score: 0, confidence_score: 0, engagement_score: 0 })
  const [avgScores, setAvgScores] = useState({ technical: 0, depth: 0 })
  const [answeredCount, setAnsweredCount] = useState(0)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text')

  const audio = useAudio({ autoStart: false })
  const video = useVideo(videoRef, { autoStart: false, sampleIntervalMs: 500 })

  useEffect(() => {
    let stream: MediaStream | null = null
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' }, audio: false })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setCameraReady(true)
          setTimeout(() => { video.start().catch(() => {}) }, 500)
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setCameraError(err instanceof Error ? err.message : 'Camera access denied')
      }
    }
    startCamera()
    return () => { video.stop(); if (stream) stream.getTracks().forEach(t => t.stop()) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { if (!currentQuestion && !state?.question) navigate('/upload') }, [currentQuestion, state, navigate])

  // Text already in the box when recording started; speech is appended to it
  const answerBeforeVoiceRef = useRef('')

  const toggleVoice = useCallback(() => {
    if (inputMode === 'voice') { audio.stop(); setInputMode('text') }
    else if (audio.isSupported) { answerBeforeVoiceRef.current = answer; audio.start(); setInputMode('voice') }
  }, [inputMode, audio, answer])

  useEffect(() => {
    if (inputMode === 'voice' && audio.transcript) setAnswer(`${answerBeforeVoiceRef.current} ${audio.transcript}`.trim())
  }, [inputMode, audio.transcript])

  // Recognition died (mic blocked, unsupported browser…) — fall back to typing
  useEffect(() => { if (audio.error) setInputMode('text') }, [audio.error])

  const handleSubmit = async () => {
    if (!answer.trim() || !currentQuestion || !sessionId) return
    setSubmitting(true); setError(null)
    if (inputMode === 'voice') { audio.stop(); setInputMode('text') }
    try {
      const words = answer.trim().split(/\s+/).filter(Boolean).length
      const typedConfidence = Math.min(1, Number((words / 40).toFixed(3)))
      const result = await submitAnswer({
        session_id: sessionId,
        question_id: currentQuestion.id,
        answer_text: answer,
        confidence_score: audio.confidenceScore > 0 ? audio.confidenceScore : typedConfidence,
        engagement_score: video.engagementScore > 0 ? video.engagementScore : null,
      })
      setScores(result.scores)
      setFeedbackSnippet(result.feedback_snippet)
      const newCount = answeredCount + 1
      setAnsweredCount(newCount)
      setAvgScores({
        technical: ((avgScores.technical * answeredCount) + result.scores.technical_score) / newCount,
        depth: ((avgScores.depth * answeredCount) + result.scores.depth_score) / newCount,
      })
      setAnswer('')
      if (result.session_complete || !result.next_question) { navigate(`/feedback/${sessionId}`); return }
      setCurrentQuestion(result.next_question)
      setQuestionNumber(n => n + 1)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer')
    } finally { setSubmitting(false) }
  }

  if (!currentQuestion) {
    return <div style={{ textAlign: 'center', padding: '5rem 2rem' }}><div className="spinner" /></div>
  }

  const dc = difficultyStyle[currentQuestion.difficulty] ?? difficultyStyle.medium

  return (
    <div className="page" style={{ display: 'grid', gridTemplateColumns: '1fr 272px', gap: '1.5rem', alignItems: 'start' }}>
      {/* ── Main column ─────────────────────────────────────────────── */}
      <div>
        {/* Question header */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="badge badge-gray">Q{questionNumber} of {totalQuestions}</span>
          <span className="badge badge-purple">{currentQuestion.category.replace('_', ' ')}</span>
          <span className="badge" style={{ background: dc.bg, color: dc.color }}>{currentQuestion.difficulty}</span>
          {state?.inferredRole && (
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{state.inferredRole}</span>
          )}
        </div>

        {/* Question card */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: 16, lineHeight: 1.75, color: 'var(--text)' }}>{currentQuestion.text}</p>
        </div>

        {/* Feedback snippet */}
        {feedbackSnippet && (
          <div style={{ background: 'var(--primary-light)', borderLeft: '3px solid var(--primary)', padding: '10px 14px', borderRadius: '0 8px 8px 0', marginBottom: '1rem', fontSize: 13, color: 'var(--primary-text)', fontStyle: 'italic' }}>
            {feedbackSnippet}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: 'var(--red-bg)', borderLeft: '3px solid #EF4444', padding: '10px 14px', borderRadius: '0 8px 8px 0', marginBottom: '1rem', fontSize: 13, color: 'var(--red-text)' }}>
            {error}
          </div>
        )}

        {/* Voice toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <button onClick={toggleVoice} className="btn" style={{ background: inputMode === 'voice' ? '#EF4444' : 'var(--bg)', color: inputMode === 'voice' ? '#fff' : 'var(--text-body)', border: inputMode === 'voice' ? 'none' : '1px solid var(--border)' }}>
            {inputMode === 'voice' ? '⏹ Stop recording' : '🎤 Voice answer'}
          </button>
          {inputMode === 'voice' && audio.isListening && (
            <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', display: 'inline-block', animation: 'pulse 1s infinite' }} />
              Listening…
            </span>
          )}
          {!audio.isSupported && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Voice not supported in this browser — use Chrome or Edge</span>
          )}
        </div>

        {audio.error && (
          <div style={{ background: 'var(--red-bg)', borderLeft: '3px solid #EF4444', padding: '8px 12px', borderRadius: '0 8px 8px 0', marginBottom: 8, fontSize: 13, color: 'var(--red-text)' }}>
            🎤 {audio.error}
          </div>
        )}

        {/* Interim transcript */}
        {inputMode === 'voice' && audio.interimTranscript && (
          <div className="interim-box">{audio.interimTranscript}</div>
        )}

        {/* Answer textarea */}
        <textarea
          rows={7} value={answer}
          onChange={e => setAnswer(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit() }}
          placeholder={inputMode === 'voice' ? 'Your speech will appear here… (or type below)' : 'Type your answer here… (Ctrl+Enter to submit)'}
          style={{
            width: '100%', padding: '12px 14px',
            border: '1px solid var(--border)', borderRadius: 10,
            fontSize: 15, fontFamily: 'inherit', resize: 'vertical',
            outline: 'none', boxSizing: 'border-box',
            background: inputMode === 'voice' ? 'var(--interim-bg)' : 'var(--surface)',
            color: 'var(--text)', lineHeight: 1.65, transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
          <button onClick={handleSubmit} disabled={!answer.trim() || submitting} className="btn btn-primary btn-lg">
            {submitting ? 'Evaluating…' : questionNumber >= totalQuestions ? 'Finish interview →' : 'Submit answer →'}
          </button>
        </div>
      </div>

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', top: '70px' }}>
        {/* Webcam */}
        <div style={{ background: '#000', borderRadius: 12, overflow: 'hidden', marginBottom: '1rem', position: 'relative', aspectRatio: '4/3' }}>
          <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover', transform: 'scaleX(-1)' }} />
          {!cameraReady && !cameraError && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Starting camera…
            </div>
          )}
          {cameraError && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', textAlign: 'center', background: '#111' }}>
              <span style={{ fontSize: 24, marginBottom: 8 }}>📷</span>
              <p style={{ color: '#F87171', fontSize: 12, marginBottom: 4 }}>{cameraError}</p>
              <p style={{ color: '#6B7280', fontSize: 11 }}>Interview will continue without video</p>
            </div>
          )}
          {cameraReady && video.isActive && (
            <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', gap: 6 }}>
              <span style={{ background: 'rgba(0,0,0,0.55)', color: '#4ADE80', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                👁 {Math.round(video.engagementScore * 100)}%
              </span>
              <span style={{ background: 'rgba(0,0,0,0.55)', color: video.stressScore > 0.5 ? '#F87171' : '#FBB72A', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                😰 {Math.round(video.stressScore * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Live scores */}
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <p className="label" style={{ marginBottom: 14 }}>Live scores</p>
          <ScoreBar label="Technical"  value={scores.technical_score} />
          <ScoreBar label="Depth"      value={scores.depth_score} />
          <ScoreBar label="Confidence" value={audio.confidenceScore || scores.confidence_score} />
          <ScoreBar label="Engagement" value={video.engagementScore || scores.engagement_score} />
        </div>

        {/* Session average */}
        {answeredCount > 0 && (
          <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <p className="label" style={{ marginBottom: 6 }}>Session average</p>
            <p style={{ fontSize: 13, color: 'var(--text-body)' }}>
              Technical: <strong style={{ color: 'var(--text)' }}>{Math.round(avgScores.technical * 100)}%</strong>
              {' · '}
              Depth: <strong style={{ color: 'var(--text)' }}>{Math.round(avgScores.depth * 100)}%</strong>
            </p>
          </div>
        )}

        {/* Tips */}
        <div className="tips-panel">
          <p className="label">Tips</p>
          <ul>
            <li>Use Situation → Action → Result</li>
            <li>State trade-offs for design questions</li>
            <li>Look at the camera for engagement</li>
            <li>Speak clearly for voice mode</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
