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
      setFile(f)
      setError(null)
    } else {
      setError('Please upload a .pdf or .txt file')
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const result = await uploadResume(file)
      setProfile(result)
      setStep('profile')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleStartInterview = async () => {
    if (!profile) return
    setLoading(true)
    setError(null)
    try {
      const session = await startInterview({ profile_id: profile.profile_id })
      navigate(`/interview/${session.session_id}`, {
        state: {
          profileId: profile.profile_id,
          question: session.question,
          candidateName: profile.name,
          inferredRole: profile.inferred_role,
        },
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start interview'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (step === 'profile' && profile) {
    return (
      <div style={{ maxWidth: 650, margin: '0 auto', padding: '3rem 2rem' }}>
        <span style={{ background: '#EAF3DE', color: '#27500A', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>✅ Resume parsed</span>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: 10, marginBottom: 6 }}>
          Hi, {profile.name}!
        </h1>
        <p style={{ color: '#666', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          We've analysed your resume and inferred the best role for your profile.
        </p>

        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>Inferred role</p>
          <h2 style={{ fontSize: '1.4rem', marginBottom: 6 }}>{profile.inferred_role}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {profile.all_roles.map(r => (
              <span key={r} style={{ background: '#EEF0FF', color: '#4834D4', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{r}</span>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>Skills</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {profile.skills.map(s => (
              <span key={s} style={{ background: '#f3f4f6', padding: '3px 10px', borderRadius: 20, fontSize: 13 }}>{s}</span>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>Interview focus areas</p>
          <ul style={{ paddingLeft: 18, fontSize: 14, color: '#444', lineHeight: 2, margin: 0 }}>
            {profile.focus_areas.map(f => <li key={f}>{f}</li>)}
          </ul>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <p style={{ fontSize: 13, color: '#666' }}>
            <strong>{profile.experience_years}</strong> years of experience detected
          </p>
        </div>

        {error && <p style={{ color: '#D63031', fontSize: 14, marginBottom: 12 }}>{error}</p>}

        <button
          onClick={handleStartInterview}
          disabled={loading}
          style={{
            width: '100%', padding: '14px', background: '#6C5CE7', color: '#fff',
            border: 'none', borderRadius: 10, fontSize: '1rem', fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Starting interview…' : 'Start interview →'}
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '4rem 2rem' }}>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 8 }}>Upload your resume</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>We will parse it and tailor your interview experience.</p>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => {
          e.preventDefault()
          setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f) handleFile(f)
        }}
        onClick={() => document.getElementById('file-input')?.click()}
        style={{
          border: dragging ? '2px dashed #6C5CE7' : '2px dashed #ccc',
          borderRadius: 12, padding: '3rem 2rem', textAlign: 'center',
          cursor: 'pointer', background: dragging ? '#f0eeff' : '#fafafa',
          marginBottom: '1.5rem', transition: 'all 0.2s',
        }}
      >
        <input
          id="file-input" type="file" accept=".pdf,.txt,.text"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        {file ? (
          <div>
            <div style={{ fontSize: 32 }}>📄</div>
            <p style={{ fontWeight: 600, marginTop: 8 }}>{file.name}</p>
            <p style={{ color: '#888', fontSize: 13 }}>{(file.size / 1024).toFixed(0)} KB</p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 40 }}>☁️</div>
            <p style={{ fontWeight: 600, marginTop: 8 }}>Drag and drop your resume</p>
            <p style={{ color: '#888', fontSize: 13 }}>PDF or TXT files accepted</p>
          </div>
        )}
      </div>

      {error && <p style={{ color: '#D63031', fontSize: 14, marginBottom: 12 }}>{error}</p>}

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        style={{
          width: '100%', padding: '13px',
          background: file ? '#6C5CE7' : '#ccc', color: '#fff',
          border: 'none', borderRadius: 10, fontSize: '1rem', fontWeight: 600,
          cursor: file ? 'pointer' : 'not-allowed',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Analysing resume…' : 'Analyse resume →'}
      </button>
    </div>
  )
}