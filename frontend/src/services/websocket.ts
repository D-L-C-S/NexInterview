// WebSocket client for real-time audio/video scoring during interview

const WS_BASE = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000'

export interface InterviewScorePayload {
  confidence_score: number
  engagement_score: number
}

const clampScore = (value: number) => Math.max(0, Math.min(1, Number(value.toFixed(3))))

export class InterviewSocket {
  private ws: WebSocket | null = null
  private queuedMessages: string[] = []

  connect(sessionId: string, onMessage: (data: unknown) => void) {
    this.disconnect()

    this.ws = new WebSocket(`${WS_BASE}/ws/${sessionId}`)
    this.ws.onopen = () => this.flushQueue()
    this.ws.onmessage = (e) => onMessage(JSON.parse(e.data))
  }

  send(payload: object) {
    const message = JSON.stringify(payload)

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message)
      return
    }

    if (this.ws?.readyState === WebSocket.CONNECTING) {
      this.queuedMessages.push(message)
    }
  }

  sendScores(payload: InterviewScorePayload) {
    this.send({
      confidence_score: clampScore(payload.confidence_score),
      engagement_score: clampScore(payload.engagement_score),
    })
  }

  disconnect() {
    this.ws?.close()
    this.ws = null
    this.queuedMessages = []
  }

  private flushQueue() {
    if (this.ws?.readyState !== WebSocket.OPEN) return

    for (const message of this.queuedMessages) {
      this.ws.send(message)
    }
    this.queuedMessages = []
  }
}
