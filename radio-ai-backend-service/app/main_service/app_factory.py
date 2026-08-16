from __future__ import annotations

from pathlib import Path
from typing import Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.admin import admin_router
from app.config import settings
from app.device import device_router, theater_ws_router
from app.internal_router import internal_router

try:
    from radio_ai_crawler import SUPPORTED_TAGS
except ImportError:
    from radio_ai_crawler.zaker_fetcher import SUPPORTED_TAGS

try:
    from radio_ai_data import init_database
except ImportError:
    import sys
    sys.path.append(str(Path(__file__).resolve().parents[3] / "radio-ai-data"))
    from radio_ai_data import init_database

from .pipeline import FetchRequest, PipelineRequest, fetch_and_store, run_pipeline, create_script, create_audio
from .scheduler import (
    AutomationConfigUpdate,
    AutomationRunRequest,
    AutomationStateUpdate,
    get_automation_runs_handler,
    get_automation_status,
    run_manual_automation,
    update_automation_config_handler,
    update_automation_state_handler,
)


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
    node_type: str = 'general'
    category: str = '新闻频道'


class ChannelCopyRequest(BaseModel):
    doll_name: str
    style_keyword: str


def create_app() -> FastAPI:
    settings.audio_dir.mkdir(parents=True, exist_ok=True)
    init_database()

    app = FastAPI(title="RADIO AI Backend Service", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.mount("/static/audio", StaticFiles(directory=settings.audio_dir), name="audio")

    # 包含子路由
    app.include_router(admin_router)
    app.include_router(device_router)
    app.include_router(theater_ws_router)
    app.include_router(internal_router)

    # 健康与能力接口
    @app.get("/health")
    def health() -> dict[str, Any]:
        return {
            "status": "ok",
            "service": "radio-ai-backend-service",
            "llm_provider": settings.llm_provider,
            "tts_provider": settings.tts_provider,
        }

    @app.get("/api/v1/radio-ai/capabilities")
    def capabilities() -> dict[str, Any]:
        return {
            "news_tags": list(SUPPORTED_TAGS),
            "llm_provider": settings.llm_provider,
            "tts_provider": settings.tts_provider,
            "default_voice": settings.default_voice,
        }

    # Pipeline & Fetch endpoints
    @app.post("/api/v1/radio-ai/news/fetch")
    async def fetch_news(request: FetchRequest) -> dict[str, Any]:
        try:
            return await fetch_and_store(request)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    @app.post("/api/v1/radio-ai/news/pipeline")
    async def pipeline(request: PipelineRequest) -> dict[str, Any]:
        try:
            return await run_pipeline(request)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    @app.post("/api/v1/radio-ai/news/{news_id}/script/generate")
    async def generate_news_script(news_id: str, req: ScriptGenerateRequest | None = None) -> dict[str, Any]:
        try:
            custom_prompt = req.custom_prompt if req else None
            llm_model = req.llm_model if req else None
            llm_provider = req.llm_provider if req else None
            return await create_script(news_id, custom_prompt=custom_prompt, llm_model=llm_model, llm_provider=llm_provider)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    @app.post("/api/v1/admin/news/{news_id}/audio/regenerate")
    async def regenerate_audio(news_id: str, request: AudioRequest) -> dict[str, Any]:
        try:
            audio = await create_audio(news_id, voice_id=request.voice_id, tts_provider=request.tts_provider)
            return {"status": audio["status"], "audio": audio}
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    @app.post("/api/v1/radio-ai/tts/preview")
    async def preview_tts(request: PreviewAudioRequest) -> dict[str, Any]:
        try:
            import httpx
            from uuid import uuid4
            import asyncio
            
            preview_dir = settings.audio_dir / "preview"
            preview_dir.mkdir(parents=True, exist_ok=True)
            output_stem = preview_dir / f"preview-{uuid4().hex[:8]}"
            
            import os
            gen_cfg = {}
            try:
                from radio_ai_data import get_generative_config
                gen_cfg = get_generative_config()
            except Exception:
                pass
            
            configured_key = gen_cfg.get("dashscope_api_key") or os.getenv("DASHSCOPE_API_KEY")

            payload = {
                "text": request.text,
                "voice_id": request.voice_id or settings.default_voice,
                "provider": request.tts_provider,
                "api_key": configured_key,
            }
            
            tts_service_url = "http://127.0.0.1:8018/api/generate"
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(tts_service_url, json=payload)
                response.raise_for_status()
                
                content_type = response.headers.get("content-type", "")
                ext = ".mp3" if "mpeg" in content_type else ".wav"
                path = output_stem.with_suffix(ext)
                path.write_bytes(response.content)
            
            # Estimate duration roughly based on character count if we don't parse the audio file
            duration = max(1, round(len(request.text) / 4))
            
            rel_path = path.relative_to(settings.audio_dir)
            audio_url = f"/static/audio/{rel_path.as_posix()}"
            
            return {"status": "ok", "audio_url": audio_url, "duration": duration}
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    # Automation Scheduler Endpoints
    @app.get("/api/v1/radio-ai/automation")
    def get_automation() -> dict[str, Any]:
        return get_automation_status()

    @app.patch("/api/v1/radio-ai/automation/config")
    def update_automation(request: AutomationConfigUpdate) -> dict[str, Any]:
        return update_automation_config_handler(request)

    @app.put("/api/v1/radio-ai/automation/state")
    def update_automation_state(request: AutomationStateUpdate) -> dict[str, Any]:
        return update_automation_state_handler(request)

    @app.get("/api/v1/radio-ai/automation/runs")
    def automation_runs(page: int = 1, page_size: int = 20) -> dict[str, Any]:
        return get_automation_runs_handler(page=page, page_size=page_size)

    @app.post("/api/v1/radio-ai/automation/runs")
    async def run_automation(request: AutomationRunRequest) -> dict[str, Any]:
        return await run_manual_automation(request)

    return app
