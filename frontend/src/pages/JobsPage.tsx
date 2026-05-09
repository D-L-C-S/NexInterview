import { useState } from 'react'

const JOBS = [
  { id: 'j1', title: 'Backend Engineer (Python)', company: 'Zepto', location: 'Bangalore', match: 94, reasons: ['FastAPI matches your stack', 'PostgreSQL experience', 'Startup pace'], salary: '₹18L – ₹28L', posted: '2 days ago', source: 'LinkedIn', url: '#' },
  { id: 'j2', title: 'Software Engineer II – Platform', company: 'Razorpay', location: 'Bangalore', match: 88, reasons: ['Python + microservices', 'Mid-level seniority match', 'Fintech domain'], salary: '₹22L – ₹35L', posted: '5 days ago', source: 'LinkedIn', url: '#' },
  { id: 'j3', title: 'Backend Developer', company: 'Postman', location: 'Bangalore (hybrid)', match: 82, reasons: ['REST API expertise', 'Developer tooling', 'Python backend'], salary: '₹20L – ₹30L', posted: '1 week ago', source: 'Adzuna', url: '#' },
  { id: 'j4', title: 'Python Backend Engineer', company: 'Groww', location: 'Bangalore', match: 79, reasons: ['Python stack', 'High-scale systems', 'Fintech domain'], salary: '₹16L – ₹26L', posted: '3 days ago', source: 'Indeed', url: '#' },
]

export default function JobsPage() {
  const [minMatch, setMinMatch] = useState(0)
  const filtered = JOBS.filter(j => j.match >= minMatch).sort((a, b) => b.match - a.match)

  const matchStyle = (m: number) => m >= 85 ? { color: '#27500A', bg: '#EAF3DE' } : m >= 70 ? { color: '#633806', bg: '#FAEEDA' } : { color: '#444', bg: '#F1EFE8' }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.5rem' }}>
      <span style={{ background: '#EAF3DE', color: '#27500A', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{JOBS.length} jobs found</span>
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '8px 0 4px' }}>Recommended jobs</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>Matched to your resume for <strong>Backend Engineer</strong> roles</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: '#fff', borderRadius: 10, border: '1px solid #eee', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: 13, color: '#666', whiteSpace: 'nowrap' }}>Min match</span>
        <input type="range" min={0} max={90} step={10} value={minMatch} onChange={e => setMinMatch(Number(e.target.value))} style={{ flex: 1 }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#6C5CE7', minWidth: 36 }}>{minMatch}%</span>
        <span style={{ fontSize: 13, color: '#888' }}>{filtered.length} results</span>
      </div>

      {filtered.map((job, i) => {
        const ms = matchStyle(job.match)
        return (
          <div key={job.id} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '1rem', alignItems: 'start' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: i === 0 ? '#EEF0FF' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: i === 0 ? '#6C5CE7' : '#888' }}>{i + 1}</div>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                <h3 style={{ fontSize: '1rem' }}>{job.title}</h3>
                <span style={{ background: '#EEF0FF', color: '#4834D4', padding: '2px 8px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{job.source}</span>
              </div>
              <p style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>{job.company} · {job.location} <span style={{ color: '#27500A', fontWeight: 600, marginLeft: 8 }}>{job.salary}</span></p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                {job.reasons.map(r => <span key={r} style={{ background: '#EEF0FF', color: '#4834D4', padding: '2px 8px', borderRadius: 20, fontSize: 12 }}>{r}</span>)}
              </div>
              <p style={{ fontSize: 12, color: '#aaa' }}>Posted {job.posted}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
              <span style={{ padding: '6px 16px', borderRadius: 20, fontWeight: 700, fontSize: 15, background: ms.bg, color: ms.color }}>{job.match}%</span>
              <a href={job.url} style={{ background: '#6C5CE7', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Apply →</a>
            </div>
          </div>
        )
      })}
    </div>
  )
}
