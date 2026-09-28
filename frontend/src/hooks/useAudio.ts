import { useCallback, useEffect, useRef, useState } from 'react'
import {
  isSupported as isSpeechSupported,
  onError,
  onResult,
  startListening,
  stopListening,
} from '../utils/speechHandler.js'

interface FinalAudioScore {
  transcript: string
  confidenceScore: number
}

interface UseAudioOptions {
  autoStart?: boolean
  onFinalScore?: (score: FinalAudioScore) => void
}

const clampScore = (value: number) => Math.max(0, Math.min(1, Number(value.toFixed(3))))

const confidenceFromSpeech = (transcript: string, rawConfidence?: number) => {
  const words = transcript.trim().split(/\s+/).filter(Boolean).length
  const wordCoverage = Math.min(1, words / 12)
  const recognitionConfidence =
    typeof rawConfidence === 'number' && rawConfidence > 0 ? rawConfidence : 0.55

  return clampScore(recognitionConfidence * 0.75 + wordCoverage * 0.25)
}

export function useAudio({ autoStart = false, onFinalScore }: UseAudioOptions = {}) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [confidenceScore, setConfidenceScore] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const onFinalScoreRef = useRef(onFinalScore)

  useEffect(() => {
    onFinalScoreRef.current = onFinalScore
  }, [onFinalScore])

  const start = useCallback(() => {
    if (!isSpeechSupported()) return

    // Each recording starts fresh so a previous answer doesn't leak into the next
    setTranscript('')
    setInterimTranscript('')
    setError(null)

    onError((message) => {
      setError(message)
      setIsListening(false)
      setInterimTranscript('')
    })

    onResult((text, isFinal, rawConfidence) => {
      if (!isFinal) {
        setInterimTranscript(text)
        return
      }

      const nextConfidence = confidenceFromSpeech(text, rawConfidence)
      setTranscript((current: string) => `${current} ${text}`.trim())
      setInterimTranscript('')
      setConfidenceScore(nextConfidence)
      onFinalScoreRef.current?.({
        transcript: text,
        confidenceScore: nextConfidence,
      })
    })

    startListening()
    setIsListening(true)
  }, [])

  const stop = useCallback(() => {
    stopListening()
    setIsListening(false)
    setInterimTranscript('')
  }, [])

  useEffect(() => {
    if (autoStart) start()
    return stop
  }, [autoStart, start, stop])

  return {
    confidenceScore,
    error,
    interimTranscript,
    isListening,
    isSupported: isSpeechSupported(),
    start,
    stop,
    transcript,
  }
}

export default useAudio
