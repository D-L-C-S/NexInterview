import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import {
  getEngagementScore,
  getStressScore,
  initFaceMesh,
  stopFaceMesh,
} from '../utils/visionHandler.js'

interface UseVideoOptions {
  autoStart?: boolean
  sampleIntervalMs?: number
}

const normalizePercent = (value: number) =>
  Math.max(0, Math.min(1, Number((value / 100).toFixed(3))))

export function useVideo(
  videoRef: RefObject<HTMLVideoElement | null> | null,
  { autoStart = false, sampleIntervalMs = 500 }: UseVideoOptions = {},
) {
  const [engagementScore, setEngagementScore] = useState(0)
  const [stressScore, setStressScore] = useState(0)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<number | null>(null)

  const clearSampling = useCallback(() => {
    if (intervalRef.current === null) return

    window.clearInterval(intervalRef.current)
    intervalRef.current = null
  }, [])

  const sampleScores = useCallback(() => {
    setEngagementScore(normalizePercent(getEngagementScore()))
    setStressScore(normalizePercent(getStressScore()))
  }, [])

  const start = useCallback(async () => {
    const videoEl = videoRef?.current
    if (!videoEl) {
      setError('Video element is not ready.')
      return
    }

    try {
      setError(null)
      await initFaceMesh(videoEl)
      sampleScores()
      clearSampling()
      intervalRef.current = window.setInterval(sampleScores, sampleIntervalMs)
      setIsActive(true)
    } catch (err) {
      setIsActive(false)
      setError(err instanceof Error ? err.message : 'Unable to start video analysis.')
    }
  }, [clearSampling, sampleIntervalMs, sampleScores, videoRef])

  const stop = useCallback(() => {
    clearSampling()
    stopFaceMesh()
    setIsActive(false)
  }, [clearSampling])

  useEffect(() => {
    if (autoStart) void start()
    return stop
  }, [autoStart, start, stop])

  return {
    engagementScore,
    error,
    isActive,
    start,
    stop,
    stressScore,
  }
}

export default useVideo
