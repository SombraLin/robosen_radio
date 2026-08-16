from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

try:
    from radio_ai_data import execute, fetch_all, utc_now, DOLL_NAME_MAP
except ImportError:
    import sys
    sys.path.append(str(Path(__file__).resolve().parents[3] / "radio-ai-data"))
    from radio_ai_data import execute, fetch_all, utc_now, DOLL_NAME_MAP

try:
    from radio_ai_engine import generate_script
except ImportError:
    import sys
    sys.path.append(str(Path(__file__).resolve().parents[3] / "radio-ai-engine"))
    from radio_ai_engine import generate_script


router = APIRouter(tags=["device"])


class PlaybackStatusRequest(BaseModel):
    device_sn: str = Field(min_length=1, max_length=100)
    doll_id: str = Field(min_length=1, max_length=100)
    channel_id: str = Field(min_length=1, max_length=100)
    current_item_id: str = Field(min_length=1, max_length=100)
    progress_seconds: int = Field(default=0, ge=0)
    status: str = Field(default="playing", max_length=50)


class InterruptionChatRequest(BaseModel):
    doll_id: str = Field(min_length=1, max_length=100)
    channel_id: str = Field(default="CH-NEWS-01", max_length=100)
    current_item_id: str = Field(default="item-01", max_length=100)
    play_offset_seconds: int = Field(default=0, ge=0)
    user_text: str = Field(min_length=1, max_length=2000)
    session_id: str | None = None


@router.get("/api/v1/device/dolls/{doll_id}/channels")
def get_device_doll_channels(doll_id: str) -> dict[str, Any]:
    doll_name = DOLL_NAME_MAP.get(doll_id, doll_id)
    news_rows = fetch_all("SELECT * FROM news WHERE deleted_at IS NULL AND script_status = 'ready' ORDER BY updated_at DESC LIMIT 10")
    playlist_items = [
        {
            "id": "jingle-intro",
            "type": "intro",
            "title": f"{doll_name} 频道开场语",
            "speakerRole": doll_name,
            "durationSeconds": 5,
            "contentSnippet": f"大家好，我是 {doll_name}，欢迎收听我的专属频道！",
            "audioUrl": None,
        }
    ]
    for row in news_rows:
        audio_path = row.get("audio_path")
        audio_url = f"/static/audio/{Path(audio_path).name}" if audio_path else None
        playlist_items.append({
            "id": f"news-{row['id']}",
            "type": "news_script",
            "title": row["title"],
            "speakerRole": doll_name,
            "durationSeconds": row.get("audio_duration_seconds") or 25,
            "contentSnippet": row.get("script_text") or row.get("clean_summary"),
            "audioUrl": audio_url,
        })
    playlist_items.append({
        "id": "jingle-outro",
        "type": "outro",
        "title": f"{doll_name} 频道谢幕语",
        "speakerRole": doll_name,
        "durationSeconds": 5,
        "contentSnippet": "感谢收听，我们下期再见！",
        "audioUrl": None,
    })

    return {
        "doll_id": doll_id,
        "doll_name": doll_name,
        "channels": [
            {
                "channel_id": f"CH-{doll_id.upper()}-NEWS",
                "channel_name": f"{doll_name} 治愈新闻频道",
                "category": "新闻频道",
                "playlist": playlist_items,
            }
        ],
    }


@router.post("/api/v1/device/playback/status")
def report_device_playback_status(request: PlaybackStatusRequest) -> dict[str, Any]:
    now = utc_now()
    execute(
        """INSERT INTO playback_logs(device_sn, doll_id, channel_id, current_item_id, progress_seconds, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (request.device_sn, request.doll_id, request.channel_id, request.current_item_id, request.progress_seconds, request.status, now),
    )
    return {
        "status": "acknowledged",
        "sync_timestamp": now,
    }


@router.post("/api/v1/device/interruption/chat")
async def handle_interruption_chat(request: InterruptionChatRequest) -> dict[str, Any]:
    doll_name = DOLL_NAME_MAP.get(request.doll_id, request.doll_id)
    session_id = request.session_id or f"sess-{utc_now()}"

    reply_text = await generate_script(
        f"与{doll_name}在节目中打断对话",
        doll_name,
        f"用户说: {request.user_text}",
        None,
        custom_prompt=f"你是玩偶{doll_name}。请以极度拟人化且契合玩偶人设的口吻温柔应答用户的打断追问，控制在50字以内。",
        llm_provider="local",
    )

    return {
        "session_id": session_id,
        "reply_text": reply_text,
        "reply_audio_url": None,
        "duration_seconds": max(3, round(len(reply_text) / 5)),
        "suggested_action": "resume_from_offset",
        "resume_offset_seconds": request.play_offset_seconds,
    }
