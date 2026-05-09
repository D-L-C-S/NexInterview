import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function UploadPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleFile = (f: File) => {
    if (f.type === 'application/pdf') setFile(f)
  }

  const handleSubmit = async () => {
    if (!file) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    navigate('/interview/mock-session-123')
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
          borderRadius: 12,
          padding: '3rem 2rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? '#f0eeff' : '#fafafa',
          marginBottom: '1.5rem',
          transition: 'all 0.2s',
        }}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
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
            <p style={{ color: '#888', fontSize: 13 }}>PDF only</p>
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!file || loading}
        style={{
          width: '100%',
          padding: '13px',
          background: file ? '#6C5CE7' : '#ccc',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontSize: '1rem',
          fontWeight: 600,
          cursor: file ? 'pointer' : 'not-allowed',
        }}
      >
        {loading ? 'Analysing...' : 'Analyse resume →'}
      </button>
    </div>
  )
}