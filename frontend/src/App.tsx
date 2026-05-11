import { useState } from 'react'
import { BrowserRouter, Route, Routes, useLocation, Link } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import UploadPage from './pages/UploadPage'
import InterviewPage from './pages/InterviewPage'
import FeedbackPage from './pages/FeedbackPage'
import JobsPage from './pages/JobsPage'

function Nav() {
  const { pathname } = useLocation()
  const isInterview = pathname.startsWith('/interview/')

  const [dark, setDark] = useState(
    () => document.documentElement.dataset.theme === 'dark'
  )

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.dataset.theme = next ? 'dark' : 'light'
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link to="/" className="nav-logo">NexInterview</Link>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={toggleTheme}
            className="btn btn-ghost"
            style={{ padding: '6px 10px', fontSize: 15 }}
            aria-label="Toggle dark mode"
          >
            {dark ? '☀️' : '🌙'}
          </button>
          {!isInterview && (
            <Link to="/upload" className="btn btn-primary" style={{ padding: '7px 16px', fontSize: '0.8rem' }}>
              Start interview
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/interview/:sessionId" element={<InterviewPage />} />
        <Route path="/feedback/:sessionId" element={<FeedbackPage />} />
        <Route path="/jobs" element={<JobsPage />} />
      </Routes>
    </BrowserRouter>
  )
}
