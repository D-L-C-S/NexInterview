import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadResume, startInterview } from '../services/api'
import type { CandidateProfileResponse } from '../types'

export default function UploadPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'upload' | 'profile'>('upload')
  const [profile, setProfile] = useState<CandidateProfileResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (ext === 'pdf' || ext === 'txt' || ext === 'text') {
      setFile(f); setError(null)
    } else {
      setError('Please upload a .pdf or .txt file')
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true); setError(null)
    try {
      const result = await uploadResume(file)
      setProfile(result); setStep('profile')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally { setLoading(false) }
  }

  const handleStartInterview = async () => {
    if (!profile) return
    setLoading(true); setError(null)
    try {
      const session = await startInterview({ profile_id: profile.profile_id })
      navigate(`/interview/${session.session_id}`, {
        state: { profileId: profile.profile_id, question: session.question, candidateName: profile.name, inferredRole: profile.inferred_role },
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start interview')
    } finally { setLoading(false) }
  }

  if (step === 'profile' && profile) {
    return (
      <div className="page-sm fade-up" style={{ paddingTop: '2.5rem' }}>
        <span className="badge badge-green">Resume parsed</span>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 12, marginBottom: 6, letterSpacing: '-0.3px', color: 'var(--text)' }}>
          Hi, {profile.name}!
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', lineHeight: 1.65 }}>
          We've analysed your resume and inferred the best role for your profile.
        </p>

        <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <p className="label" style={{ marginBottom: 8 }}>Inferred role</p>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>{profile.inferred_role}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {profile.all_roles.map(r => <span key={r} className="badge badge-purple">{r}</span>)}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <p className="label" style={{ marginBottom: 10 }}>Skills detected</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {profile.skills.map(s => <span key={s} className="badge badge-gray">{s}</span>)}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <p className="label" style={{ marginBottom: 10 }}>Interview focus areas</p>
          <ul style={{ paddingLeft: 18, fontSize: 14, color: 'var(--text-body)', lineHeight: 2, margin: 0 }}>
            {profile.focus_areas.map(f => <li key={f}>{f}</li>)}
          </ul>
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          <strong style={{ color: 'var(--text)' }}>{profile.experience_years}</strong> years of experience detected
        </p>

        {error && <div className="alert-error">{error}</div>}

        <button onClick={handleStartInterview} disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? 'Starting interview…' : 'Start interview →'}
        </button>
      </div>
    )
  }

  return (
    <div className="page-sm fade-up" style={{ paddingTop: '2.5rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 6, letterSpacing: '-0.3px', color: 'var(--text)' }}>Upload your resume</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.65 }}>
        We'll parse it and tailor your interview experience.
      </p>

      <label
        htmlFor="file-input"
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        style={{
          display: 'block',
          border: `2px dashed ${dragging ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: 14, padding: '3rem 2rem', textAlign: 'center',
          cursor: 'pointer', marginBottom: '1.25rem', transition: 'all 0.2s',
          background: dragging ? 'var(--primary-light)' : 'var(--surface)',
        }}
      >
        <input id="file-input" type="file" accept=".pdf,.txt,.text" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

        {file ? (
          <>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
            <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4, color: 'var(--text)' }}>{file.name}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{(file.size / 1024).toFixed(0)} KB · click to change</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 36, marginBottom: 10 }}>☁️</div>
            <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4, color: 'var(--text)' }}>Drag and drop your resume</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>PDF or TXT · click to browse</p>
          </>
        )}
      </label>

      {error && <div className="alert-error">{error}</div>}

      <button onClick={handleUpload} disabled={!file || loading} className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
        {loading ? 'Analysing resume…' : 'Analyse resume →'}
      </button>
    </div>
  )
}
