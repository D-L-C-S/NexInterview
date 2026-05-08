import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { InterviewSocket } from '../services/websocket'
import type { InterviewScorePayload } from '../services/websocket'
import useAudio from './useAudio'
import useVideo from './useVideo'

interface UseInterviewOptions {
  sessionId?: string
  videoRef?: RefObject<HTMLVideoElement | null>
  autoConnect?: boolean
  autoStartMedia?: boolean
  onSocketMessage?: (data: unknown) => void
}

export function useInterview({
  sessionId,
  videoRef,
  autoConnect = true,
  autoStartMedia = false,
  onSocketMessage,
}: UseInterviewOptions = {}) {
  const socketRef = useRef(new InterviewSocket())
  const engagementRef = useRef(0)

  const sendScores = useCallback((payload: InterviewScorePayload) => {
    socketRef.current.sendScores(payload)
  }, [])

  const video = useVideo(videoRef ?? null, {
    autoStart: autoStartMedia && Boolean(videoRef),
  })

  useEffect(() => {
    engagementRef.current = video.engagementScore
  }, [video.engagementScore])

  const audio = useAudio({
    autoStart: autoStartMedia,
    onFinalScore: ({ confidenceScore }) => {
      sendScores({
        confidence_score: confidenceScore,
        engagement_score: engagementRef.current,
      })
    },
  })

  const connectSocket = useCallback(() => {
    if (!sessionId) return
    socketRef.current.connect(sessionId, onSocketMessage ?? (() => undefined))
  }, [onSocketMessage, sessionId])

  const disconnectSocket = useCallback(() => {
    socketRef.current.disconnect()
  }, [])

  useEffect(() => {
    if (autoConnect) connectSocket()
    return disconnectSocket
  }, [autoConnect, connectSocket, disconnectSocket])

  const latestScores = useMemo(
    () => ({
      confidence_score: audio.confidenceScore,
      engagement_score: video.engagementScore,
    }),
    [audio.confidenceScore, video.engagementScore],
  )

  const sendLatestScores = useCallback(() => {
    sendScores(latestScores)
  }, [latestScores, sendScores])

  return {
    audio,
    connectSocket,
    disconnectSocket,
    latestScores,
    sendLatestScores,
    video,
  }
}

export default useInterview
