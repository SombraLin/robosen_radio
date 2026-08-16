from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import httpx

from app.admin import admin_router
from app.auth import require_admin_session
from app.config import settings
from app.device import device_router, theater_ws_router
from app.internal_router import internal_router
from app.schemas import (
    ScriptGenerateRequest,
    AudioRequest,
    PreviewAudioRequest,
    ScriptDraftRequest,
    ChannelCopyRequest,
    FetchRequest,
    PipelineRequest,
    AutomationConfigUpdate,
    AutomationRunRequest,
    AutomationStateUpdate,
)

try:
    from radio_ai_crawler import SUPPORTED_TAGS
except ImportError:
    from radio_ai_crawler.zaker_fetcher import SUPPORTED_TAGS

try:
    from radio_ai_data import init_database, get_generative_config
except ImportError:
    import sys
    sys.path.append(str(Path(__file__).resolve().parents[3] / "radio-ai-data"))
    from radio_ai_data import init_database, get_generative_config

from .pipeline import fetch_and_store, run_pipeline, create_script, create_audio
from .scheduler import (
    get_automation_runs_handler,
    get_automation_status,
    run_manual_automation,
    update_automation_config_handler,
    update_automation_state_handler,
)


def create_app() -> FastAPI:
    settings.audio_dir.mkdir(parents=True, exist_ok=True)
    init_database()

    app = FastAPI(title="RADIO AI Backend Service", version="1.0.0")

    # Dynamic CORS from ADMIN_ALLOWED_ORIGINS
    origins = [o.strip() for o in settings.admin_allowed_origins.split(",") if o.strip()]
    if not origins:
        origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.mount("/static/audio", StaticFiles(directory=settings.audio_dir), name="audio")

    # Routers
    app.include_router(admin_router)
    app.include_router(device_router)
    app.include_router(theater_ws_router)
    app.include_router(internal_router)

    # Health & Capabilities
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

    # Pipeline & Fetch endpoints (Admin Session Protected)
    @app.post("/api/v1/radio-ai/news/fetch")
    async def fetch_news(
        request: FetchRequest,
        current_user: dict[str, Any] = Depends(require_admin_session),
    ) -> dict[str, Any]:
        try:
            return await fetch_and_store(request)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    @app.post("/api/v1/radio-ai/news/pipeline")
    async def pipeline(
        request: PipelineRequest,
        current_user: dict[str, Any] = Depends(require_admin_session),
    ) -> dict[str, Any]:
        try:
            return await run_pipeline(request)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    @app.post("/api/v1/radio-ai/news/{news_id}/script/generate")
    async def generate_news_script(
        news_id: str,
        req: ScriptGenerateRequest | None = None,
        current_user: dict[str, Any] = Depends(require_admin_session),
    ) -> dict[str, Any]:
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
    async def regenerate_audio(
        news_id: str,
        request: AudioRequest,
        current_user: dict[str, Any] = Depends(require_admin_session),
    ) -> dict[str, Any]:
        try:
            return await create_audio(news_id, voice_id=request.voice_id, tts_provider=request.tts_provider)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    @app.post("/api/v1/radio-ai/tts/preview")
    async def preview_tts(
        request: PreviewAudioRequest,
        current_user: dict[str, Any] = Depends(require_admin_session),
    ) -> dict[str, Any]:
        try:
            preview_dir = settings.audio_dir / "preview"
            preview_dir.mkdir(parents=True, exist_ok=True)
            output_stem = preview_dir / f"preview-{uuid4().hex[:8]}"

            gen_cfg = get_generative_config()
            configured_key = gen_cfg.get("dashscope_api_key") or os.getenv("DASHSCOPE_API_KEY")

            payload = {
                "text": request.text,
                "voice_id": request.voice_id or settings.default_voice,
                "provider": request.tts_provider,
                "api_key": configured_key,
            }

            tts_service_url = f"{settings.tts_service_url}/api/generate"
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(tts_service_url, json=payload)
                response.raise_for_status()

                content_type = response.headers.get("content-type", "")
                ext = ".mp3" if "mpeg" in content_type else ".wav"
                path = output_stem.with_suffix(ext)
                path.write_bytes(response.content)

            duration = max(1, round(len(request.text) / 4))
            rel_path = path.relative_to(settings.audio_dir)
            audio_url = f"/static/audio/{rel_path.as_posix()}"

            return {"status": "ok", "audio_url": audio_url, "duration": duration}
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    # Automation Scheduler Endpoints (Admin Session Protected)
    @app.get("/api/v1/radio-ai/automation")
    def get_automation(current_user: dict[str, Any] = Depends(require_admin_session)) -> dict[str, Any]:
        return get_automation_status()

    @app.patch("/api/v1/radio-ai/automation/config")
    def update_automation(
        request: AutomationConfigUpdate,
        current_user: dict[str, Any] = Depends(require_admin_session),
    ) -> dict[str, Any]:
        return update_automation_config_handler(request)

    @app.put("/api/v1/radio-ai/automation/state")
    def update_automation_state(
        request: AutomationStateUpdate,
        current_user: dict[str, Any] = Depends(require_admin_session),
    ) -> dict[str, Any]:
        return update_automation_state_handler(request)

    @app.get("/api/v1/radio-ai/automation/runs")
    def automation_runs(
        page: int = 1,
        page_size: int = 20,
        current_user: dict[str, Any] = Depends(require_admin_session),
    ) -> dict[str, Any]:
        return get_automation_runs_handler(page=page, page_size=page_size)

    @app.post("/api/v1/radio-ai/automation/runs")
    async def run_automation(
        request: AutomationRunRequest,
        current_user: dict[str, Any] = Depends(require_admin_session),
    ) -> dict[str, Any]:
        return await run_manual_automation(request)

    return app
