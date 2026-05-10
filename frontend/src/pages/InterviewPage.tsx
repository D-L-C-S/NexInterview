import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { submitAnswer } from '../services/api'
import useAudio from '../hooks/useAudio'
import useVideo from '../hooks/useVideo'
import type { QuestionOut, MultimodalScores } from '../types'

export default function InterviewPage() {
  const navigate = useNavigate()
  const { sessionId } = useParams<{ sessionId: string }>()
  const location = useLocation()
  const videoRef = useRef<HTMLVideoElement>(null)

  const state = location.state as {
    question?: QuestionOut
    candidateName?: string
    inferredRole?: string
  } | null

  const [currentQuestion, setCurrentQuestion] = useState<QuestionOut | null>(state?.question ?? null)
  const [answer, setAnswer] = useState('')
  const [questionNumber, setQuestionNumber] = useState(1)
  const [totalQuestions] = useState(5)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedbackSnippet, setFeedbackSnippet] = useState('')
  const [scores, setScores] = useState<MultimodalScores>({
    technical_score: 0, depth_score: 0, confidence_score: 0, engagement_score: 0,
  })
  const [avgScores, setAvgScores] = useState({ technical: 0, depth: 0 })
  const [answeredCount, setAnsweredCount] = useState(0)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text')

  // ── Audio (speech-to-text) ──────────────────────────────────────────────
  const audio = useAudio({ autoStart: false })

  // ── Video (face mesh engagement/stress) ─────────────────────────────────
  const video = useVideo(videoRef, { autoStart: false, sampleIntervalMs: 500 })

  // ── Start webcam on mount ───────────────────────────────────────────────
  useEffect(() => {
    let stream: MediaStream | null = null

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: false,
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setCameraReady(true)

          // Start face mesh analysis after camera is ready
          setTimeout(() => {
            video.start().catch(() => {
              // MediaPipe not loaded — not critical
            })
          }, 500)
        }
      } catch (err) {
        setCameraError(err instanceof Error ? err.message : 'Camera access denied')
      }
    }

    startCamera()

    return () => {
      video.stop()
      if (stream) {
        stream.getTracks().forEach(t => t.stop())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Redirect if no question ─────────────────────────────────────────────
  useEffect(() => {
    if (!currentQuestion && !state?.question) {
      navigate('/upload')
    }
  }, [currentQuestion, state, navigate])

  // ── Toggle voice mode ───────────────────────────────────────────────────
  const toggleVoice = useCallback(() => {
    if (inputMode === 'voice') {
      audio.stop()
      setInputMode('text')
    } else {
      if (audio.isSupported) {
        audio.start()
        setInputMode('voice')
      }
    }
  }, [inputMode, audio])

  // Sync speech transcript into answer
  useEffect(() => {
    if (inputMode === 'voice' && audio.transcript) {
      setAnswer(audio.transcript)
    }
  }, [inputMode, audio.transcript])

  // ── Submit answer ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!answer.trim() || !currentQuestion || !sessionId) return
    setSubmitting(true)
    setError(null)

    // Stop voice if active
    if (inputMode === 'voice') {
      audio.stop()
      setInputMode('text')
    }

    try {
      const result = await submitAnswer({
        session_id: sessionId,
        question_id: currentQuestion.id,
        answer_text: answer,
        confidence_score: audio.confidenceScore > 0 ? audio.confidenceScore : null,
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

      if (result.session_complete || !result.next_question) {
        navigate(`/feedback/${sessionId}`)
        return
      }

      setCurrentQuestion(result.next_question)
      setQuestionNumber(n => n + 1)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit answer'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Components ──────────────────────────────────────────────────────────
  const ScoreBar = ({ label, value, max = 1 }: { label: string; value: number; max?: number }) => {
    const pct = Math.round((value / max) * 100)
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
          <span style={{ color: '#555' }}>{label}</span>
          <span style={{ fontWeight: 700 }}>{pct}%</span>
        </div>
        <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: '#6C5CE7', borderRadius: 4, transition: 'width 0.6s ease' }} />
        </div>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '4rem 2rem', textAlign: 'center' }}>
        <p style={{ color: '#666' }}>Loading interview…</p>
      </div>
    )
  }

  const difficultyColors: Record<string, { bg: string; color: string }> = {
    hard: { bg: '#FCEBEB', color: '#791F1F' },
    medium: { bg: '#FAEEDA', color: '#633806' },
    easy: { bg: '#EAF3DE', color: '#27500A' },
  }
  const dc = difficultyColors[currentQuestion.difficulty] ?? difficultyColors.medium

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem' }}>
      {/* ── Main column ─────────────────────────────────────────── */}
      <div>
        {/* Question header */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ background: '#f0f0f0', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            Q{questionNumber} of {totalQuestions}
          </span>
          <span style={{ background: '#EEF0FF', color: '#4834D4', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            {currentQuestion.category.replace('_', ' ')}
          </span>
          <span style={{ background: dc.bg, color: dc.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
            {currentQuestion.difficulty}
          </span>
          {state?.inferredRole && (
            <span style={{ marginLeft: 'auto', fontSize: 13, color: '#888' }}>{state.inferredRole}</span>
          )}
        </div>

        {/* Question card */}
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: 17, lineHeight: 1.7 }}>{currentQuestion.text}</p>
        </div>

        {/* Feedback from previous answer */}
        {feedbackSnippet && (
          <div style={{ background: '#EEF0FF', borderLeft: '3px solid #6C5CE7', padding: '10px 14px', borderRadius: '0 8px 8px 0', marginBottom: '1rem', fontSize: 13, color: '#4834D4', fontStyle: 'italic' }}>
            🤖 {feedbackSnippet}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: '#FCEBEB', borderLeft: '3px solid #D63031', padding: '10px 14px', borderRadius: '0 8px 8px 0', marginBottom: '1rem', fontSize: 13, color: '#791F1F' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Voice / Text toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <button
            onClick={toggleVoice}
            style={{
              background: inputMode === 'voice' ? '#D63031' : '#f3f4f6',
              color: inputMode === 'voice' ? '#fff' : '#444',
              border: 'none', padding: '6px 14px', borderRadius: 8, fontSize: 13,
              fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {inputMode === 'voice' ? '⏹ Stop recording' : '🎤 Voice answer'}
          </button>
          {inputMode === 'voice' && audio.isListening && (
            <span style={{ fontSize: 12, color: '#D63031', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#D63031', display: 'inline-block', animation: 'pulse 1s infinite' }} />
              Listening…
            </span>
          )}
          {!audio.isSupported && (
            <span style={{ fontSize: 12, color: '#888' }}>Voice not supported in this browser</span>
          )}
        </div>

        {/* Interim transcript preview */}
        {inputMode === 'voice' && audio.interimTranscript && (
          <div style={{ background: '#fafaff', border: '1px dashed #d0d0ff', borderRadius: 8, padding: '8px 12px', marginBottom: 8, fontSize: 14, color: '#888', fontStyle: 'italic' }}>
            {audio.interimTranscript}
          </div>
        )}

        {/* Answer textarea */}
        <textarea
          rows={6} value={answer} onChange={e => setAnswer(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit() }}
          placeholder={inputMode === 'voice' ? 'Your speech will appear here… (or type below)' : 'Type your answer here… (Cmd+Enter to submit)'}
          style={{
            width: '100%', padding: 12, border: '1px solid #ddd', borderRadius: 8,
            fontSize: 15, fontFamily: 'inherit', resize: 'vertical', outline: 'none',
            boxSizing: 'border-box',
            background: inputMode === 'voice' ? '#fafaff' : '#fff',
          }}
        />

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
          <button
            onClick={handleSubmit}
            disabled={!answer.trim() || submitting}
            style={{
              background: answer.trim() ? '#6C5CE7' : '#ccc', color: '#fff',
              border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 600,
              cursor: answer.trim() && !submitting ? 'pointer' : 'not-allowed', fontSize: 14,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Evaluating…' : questionNumber >= totalQuestions ? 'Finish interview →' : 'Submit answer →'}
          </button>
        </div>
      </div>

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', top: '1rem' }}>
        {/* Webcam feed */}
        <div style={{ background: '#000', borderRadius: 12, overflow: 'hidden', marginBottom: '1rem', position: 'relative' }}>
          <video
            ref={videoRef}
            muted
            playsInline
            style={{ width: '100%', display: 'block', borderRadius: 12, transform: 'scaleX(-1)' }}
          />
          {!cameraReady && !cameraError && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 13 }}>
              Starting camera…
            </div>
          )}
          {cameraError && (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#ff6b6b', fontSize: 12, background: '#1a1a1a' }}>
              📷 {cameraError}
              <br /><span style={{ color: '#888', marginTop: 4, display: 'inline-block' }}>Interview will continue without video</span>
            </div>
          )}
          {/* Engagement/stress overlay */}
          {cameraReady && video.isActive && (
            <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', gap: 6 }}>
              <span style={{ background: 'rgba(0,0,0,0.6)', color: '#4CD137', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                👁 {Math.round(video.engagementScore * 100)}%
              </span>
              <span style={{ background: 'rgba(0,0,0,0.6)', color: video.stressScore > 0.5 ? '#ff6b6b' : '#ffa502', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                😰 {Math.round(video.stressScore * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Live scores */}
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: 14, fontSize: '1rem' }}>Live scores</h3>
          <ScoreBar label="Technical" value={scores.technical_score} />
          <ScoreBar label="Depth" value={scores.depth_score} />
          <ScoreBar label="Confidence" value={audio.confidenceScore || scores.confidence_score} />
          <ScoreBar label="Engagement" value={video.engagementScore || scores.engagement_score} />
        </div>

        {/* Session average */}
        {answeredCount > 0 && (
          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6, textTransform: 'uppercase' }}>Session average</p>
            <p style={{ fontSize: 14, color: '#444' }}>
              Technical: <strong>{Math.round(avgScores.technical * 100)}%</strong>
              {' · '}
              Depth: <strong>{Math.round(avgScores.depth * 100)}%</strong>
            </p>
          </div>
        )}

        {/* Tips */}
        <div style={{ background: '#fafaff', border: '1px solid #e0e0ff', borderRadius: 12, padding: '1rem' }}>
          <p style={{ fontSize: 12, color: '#6C5CE7', fontWeight: 600, marginBottom: 6 }}>Tips</p>
          <ul style={{ fontSize: 13, color: '#555', paddingLeft: 16, lineHeight: 1.8, margin: 0 }}>
            <li>Use Situation → Action → Result</li>
            <li>State trade-offs for design Qs</li>
            <li>Look at the camera for engagement</li>
            <li>Speak clearly for voice mode</li>
          </ul>
        </div>
      </div>

      {/* Pulse animation for recording indicator */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
