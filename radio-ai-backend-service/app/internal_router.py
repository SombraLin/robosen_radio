from typing import Any
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.auth import require_internal_secret
from radio_ai_data import execute, utc_now

internal_router = APIRouter(
    prefix="/api/v1/internal",
    tags=["Internal"],
    dependencies=[Depends(require_internal_secret)],
)


class UpdateScriptRequest(BaseModel):
    script_text: str
    custom_prompt: str | None = None
    llm_model: str | None = None


class UpdateScriptStatusRequest(BaseModel):
    status: str
    failure_stage: str | None = None
    failure_message: str | None = None


class UpdateAudioRequest(BaseModel):
    audio_path: str
    audio_duration_seconds: int
    audio_size_bytes: int
    voice_id: str
    tts_provider: str


class UpdateAudioStatusRequest(BaseModel):
    status: str
    failure_stage: str | None = None
    failure_message: str | None = None


@internal_router.put("/news/{news_id}/script")
def update_news_script(news_id: str, request: UpdateScriptRequest) -> dict[str, Any]:
    execute(
        "UPDATE news SET script_text=?, custom_prompt=?, llm_model=?, script_status='ready', audio_status=CASE WHEN audio_path IS NULL THEN 'missing' ELSE 'stale' END, updated_at=? WHERE id=?",
        (request.script_text, request.custom_prompt, request.llm_model, utc_now(), news_id),
    )
    return {"status": "ok"}


@internal_router.put("/news/{news_id}/script/status")
def update_news_script_status(news_id: str, request: UpdateScriptStatusRequest) -> dict[str, Any]:
    execute(
        "UPDATE news SET script_status=?, failure_stage=?, failure_message=?, updated_at=? WHERE id=?",
        (request.status, request.failure_stage, request.failure_message, utc_now(), news_id),
    )
    return {"status": "ok"}


@internal_router.put("/news/{news_id}/audio")
def update_news_audio(news_id: str, request: UpdateAudioRequest) -> dict[str, Any]:
    execute(
        "UPDATE news SET audio_status='ready', audio_path=?, audio_duration_seconds=?, audio_size_bytes=?, voice_id=?, tts_provider=?, updated_at=? WHERE id=?",
        (request.audio_path, request.audio_duration_seconds, request.audio_size_bytes, request.voice_id, request.tts_provider, utc_now(), news_id),
    )
    return {"status": "ok"}


@internal_router.put("/news/{news_id}/audio/status")
def update_news_audio_status(news_id: str, request: UpdateAudioStatusRequest) -> dict[str, Any]:
    execute(
        "UPDATE news SET audio_status=?, failure_stage=?, failure_message=?, updated_at=? WHERE id=?",
        (request.status, request.failure_stage, request.failure_message, utc_now(), news_id),
    )
    return {"status": "ok"}
