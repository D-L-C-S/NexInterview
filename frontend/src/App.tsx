import { BrowserRouter, Route, Routes } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import UploadPage from './pages/UploadPage'
import InterviewPage from './pages/InterviewPage'
import FeedbackPage from './pages/FeedbackPage'
import JobsPage from './pages/JobsPage'

export default function App() {
  return (
    <BrowserRouter>
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
