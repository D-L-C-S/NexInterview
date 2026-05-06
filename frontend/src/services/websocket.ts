// WebSocket client for real-time audio/video frame streaming during interview

const WS_BASE = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000'

export class InterviewSocket {
  private ws: WebSocket | null = null

  connect(sessionId: string, onMessage: (data: unknown) => void) {
    this.ws = new WebSocket(`${WS_BASE}/ws/${sessionId}`)
    this.ws.onmessage = (e) => onMessage(JSON.parse(e.data))
  }

  send(payload: object) {
    this.ws?.send(JSON.stringify(payload))
  }

  disconnect() {
    this.ws?.close()
    this.ws = null
  }
}
