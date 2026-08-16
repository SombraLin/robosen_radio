from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=128)


class LoginResponse(BaseModel):
    status: str = "ok"
    username: str
    token: str


class GenerativeConfigUpdate(BaseModel):
    default_news_prompt: str | None = None
    default_llm_provider: str | None = None
    default_llm_model: str | None = None
    default_tts_provider: str | None = None
    default_voice_id: str | None = None
    dashscope_api_key: str | None = None
    node_name: str | None = None
    is_first: bool | None = None
    is_last: bool | None = None
    word_count: int | None = None


class ScriptGenerateRequest(BaseModel):
    custom_prompt: str | None = None
    llm_model: str | None = None
    llm_provider: str | None = None


class AudioRequest(BaseModel):
    upload_to_oss: bool = False
    voice_id: str | None = None
    tts_provider: str | None = None


class PreviewAudioRequest(BaseModel):
    text: str
    voice_id: str | None = None
    tts_provider: str | None = None


class ScriptDraftRequest(BaseModel):
    doll_name: str
    prompt: str
    node_type: str = "general"
    category: str = "新闻频道"


class ChannelCopyRequest(BaseModel):
    doll_name: str
    style_keyword: str


class FetchRequest(BaseModel):
    tag: str = "hot"
    limit: int = Field(default=5, ge=1, le=20)
    language: str = "zh-CN"


class PipelineRequest(FetchRequest):
    generate_audio: bool = True
    voice_id: str | None = None
    custom_prompt: str | None = None
    llm_model: str | None = None
    tts_provider: str | None = None


class AutomationConfigUpdate(BaseModel):
    enabled: bool | None = None
    tags: dict[str, int] | None = None
    interval_minutes: int | None = Field(default=None, ge=5, le=1440)
    expected_version: int = Field(ge=1)


class AutomationStateUpdate(BaseModel):
    enabled: bool


class AutomationRunRequest(BaseModel):
    tags: list[str] | None = None
    limit_per_tag: int = Field(default=3, ge=1, le=10)
