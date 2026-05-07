"""WebSocket handler — owned by Person 2 (A/V processing).

ws://localhost:8000/ws/{session_id}
Streams real-time audio/video frames from the client and returns live scores + next question.

This file is a placeholder stub so the server starts. Person 2 should fill in the
WebSocket logic here.
"""
from fastapi import APIRouter, WebSocket

router = APIRouter()


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str) -> None:
    """Placeholder WebSocket endpoint — to be implemented by Person 2."""
    await websocket.accept()
    await websocket.send_json({"status": "connected", "session_id": session_id})
    await websocket.close()
