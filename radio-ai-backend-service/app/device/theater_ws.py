from __future__ import annotations

import json
from typing import Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["device-theater"])


class TheaterRoomManager:
    def __init__(self) -> None:
        self.active_rooms: dict[str, dict[str, WebSocket]] = {}

    async def connect(self, room_id: str, doll_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        if room_id not in self.active_rooms:
            self.active_rooms[room_id] = {}
        self.active_rooms[room_id][doll_id] = websocket

    def disconnect(self, room_id: str, doll_id: str) -> None:
        if room_id in self.active_rooms:
            self.active_rooms[room_id].pop(doll_id, None)
            if not self.active_rooms[room_id]:
                self.active_rooms.pop(room_id, None)

    async def broadcast(self, room_id: str, message: dict[str, Any], sender_doll_id: str | None = None) -> None:
        if room_id in self.active_rooms:
            for doll_id, ws in list(self.active_rooms[room_id].items()):
                if sender_doll_id and doll_id == sender_doll_id:
                    continue
                try:
                    await ws.send_text(json.dumps(message, ensure_ascii=False))
                except Exception:
                    pass


theater_manager = TheaterRoomManager()


@router.websocket("/ws/v1/device/theater/channel-session")
async def theater_websocket_endpoint(websocket: WebSocket) -> None:
    room_id = "default-room"
    doll_id = "unknown"
    try:
        data_text = await websocket.receive_text()
        init_data = json.loads(data_text)
        if init_data.get("event") == "JOIN_ROOM":
            room_id = str(init_data.get("room_id", "default-room"))
            doll_id = str(init_data.get("doll_id", "unknown"))

        await theater_manager.connect(room_id, doll_id, websocket)
        await theater_manager.broadcast(room_id, {
            "event": "ROOM_READY",
            "room_id": room_id,
            "speakers": list(theater_manager.active_rooms.get(room_id, {}).keys()),
        })

        while True:
            msg_text = await websocket.receive_text()
            event_payload = json.loads(msg_text)
            event_name = event_payload.get("event")

            if event_name == "ACT_FINISHED":
                await theater_manager.broadcast(room_id, {
                    "event": "NEXT_ACT_TRIGGER",
                    "finished_act_id": event_payload.get("act_id"),
                    "finished_speaker": doll_id,
                })
            else:
                await theater_manager.broadcast(room_id, event_payload, sender_doll_id=doll_id)

    except WebSocketDisconnect:
        theater_manager.disconnect(room_id, doll_id)
        await theater_manager.broadcast(room_id, {
            "event": "SPEAKER_LEFT",
            "room_id": room_id,
            "doll_id": doll_id,
        })
    except Exception:
        theater_manager.disconnect(room_id, doll_id)
