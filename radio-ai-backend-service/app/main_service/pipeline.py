import asyncio
import os
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import HTTPException
from pydantic import BaseModel, Field

from app.config import settings

# 引入已解耦独立模块 SDK (支持本地 fallback)
try:
    from radio_ai_crawler import fetch_zaker, normalize_tag
except ImportError:
    from radio_ai_crawler.zaker_fetcher import fetch_zaker, normalize_tag

try:
    from radio_ai_data import connection, execute, fetch_all, get_generative_config, utc_now, NewsRepository
except ImportError:
    import sys
    sys.path.append(str(Path(__file__).resolve().parents[3] / "radio-ai-data"))
    from radio_ai_data import connection, execute, fetch_all, get_generative_config, utc_now, NewsRepository

# Removed radio_ai_engine local imports to decouple TTS and LLM generation


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


async def fetch_and_store(request: FetchRequest) -> dict[str, Any]:
    tag = normalize_tag(request.tag)
    candidates, stats = await fetch_zaker(tag, request.language)
    existing = {row["url"] for row in fetch_all("SELECT url FROM news")}
    stored: list[str] = []
    for candidate in candidates:
        if candidate.url in existing:
            stats["duplicate_url_history"] = stats.get("duplicate_url_history", 0) + 1
            continue
        news_id = str(uuid4())
        now = utc_now()
        with connection() as db:
            db.execute(
                """INSERT INTO news(
                    id,title,source,url,published_at,raw_summary,clean_summary,tag,language,
                    script_status,audio_status,created_at,updated_at
                ) VALUES (?,?,?,?,?,?,?,?,?,'draft','missing',?,?)""",
                (
                    news_id, candidate.title, candidate.source, candidate.url,
                    candidate.published_at.isoformat() if candidate.published_at else None,
                    candidate.raw_summary, candidate.clean_summary, tag, request.language, now, now,
                ),
            )
        existing.add(candidate.url)
        stored.append(news_id)
        if len(stored) >= request.limit:
            break
    stats["stored"] = len(stored)
    stats["exhausted"] = int(not stored)
    return {"tag": tag, "news_ids": stored, "statistics": stats}


from .celery_app import celery_app

async def create_script(
    news_id: str,
    custom_prompt: str | None = None,
    llm_model: str | None = None,
    llm_provider: str | None = None,
) -> dict[str, Any]:
    row = NewsRepository.require_news(news_id)
    execute("UPDATE news SET script_status='generating', failure_stage=NULL, failure_message=NULL, updated_at=? WHERE id=?", (utc_now(), news_id))
    try:
        gen_cfg = get_generative_config()
        effective_prompt = (custom_prompt or row.get("custom_prompt") or gen_cfg["default_news_prompt"]).strip()
        effective_model = (llm_model or row.get("llm_model") or gen_cfg["default_llm_model"]).strip()
        effective_provider = (llm_provider or gen_cfg["default_llm_provider"]).strip()

        effective_api_key = gen_cfg.get("dashscope_api_key") or os.getenv("DASHSCOPE_API_KEY")

        # Send Celery task
        result = celery_app.send_task(
            "crawler.generate_script",
            kwargs={
                "news_id": news_id,
                "title": row["title"],
                "source": row["source"],
                "clean_summary": row["clean_summary"] or row["raw_summary"],
                "published_at": (
                    row["published_at"].isoformat()
                    if hasattr(row["published_at"], "isoformat")
                    else (str(row["published_at"]) if row["published_at"] else None)
                ),
                "custom_prompt": effective_prompt,
                "llm_model": effective_model,
                "llm_provider": effective_provider,
                "api_key": effective_api_key,
            }
        )
        
        # We wait for the result asynchronously in threadpool to avoid blocking FastAPI event loop
        task_result = await asyncio.to_thread(result.get, 60)
        if task_result.get("status") == "error":
            raise RuntimeError(task_result.get("error"))
            
    except Exception as exc:
        execute("UPDATE news SET script_status='failed', failure_stage='script', failure_message=?, updated_at=? WHERE id=?", (str(exc)[:2000], utc_now(), news_id))
        raise
    return NewsRepository.detail_dto(NewsRepository.require_news(news_id))


async def create_audio(
    news_id: str,
    voice_id: str | None = None,
    tts_provider: str | None = None,
) -> dict[str, Any]:
    row = NewsRepository.require_news(news_id)
    if row["script_status"] != "ready" or not row["script_text"].strip():
        raise HTTPException(status_code=409, detail="请先生成可用的新闻稿")
    gen_cfg = get_generative_config()
    voice = (voice_id or row.get("voice_id") or gen_cfg["default_voice_id"]).strip()
    provider = (tts_provider or row.get("tts_provider") or gen_cfg["default_tts_provider"]).strip()

    execute("UPDATE news SET audio_status='generating', failure_stage=NULL, failure_message=NULL, updated_at=? WHERE id=?", (utc_now(), news_id))
    try:
        news_dir = settings.audio_dir / "news"
        news_dir.mkdir(parents=True, exist_ok=True)
        output_stem = news_dir / f"news-{news_id}-{uuid4().hex[:8]}"
        
        previous = Path(row["audio_path"]) if row.get("audio_path") else None
        
        # Send Celery task
        result = celery_app.send_task(
            "tts.synthesize_audio",
            kwargs={
                "news_id": news_id,
                "text": row["script_text"],
                "voice_id": voice,
                "output_stem_str": str(output_stem),
                "tts_provider": provider
            }
        )
        
        task_result = await asyncio.to_thread(result.get, 60)
        if task_result.get("status") == "error":
            raise RuntimeError(task_result.get("error"))
            
        if previous and str(previous) != task_result.get("path") and previous.is_file():
            previous.unlink(missing_ok=True)
    except Exception as exc:
        execute("UPDATE news SET audio_status='failed', failure_stage='audio', failure_message=?, updated_at=? WHERE id=?", (str(exc)[:2000], utc_now(), news_id))
        raise
    return NewsRepository.audio_dto(NewsRepository.require_news(news_id))


async def run_pipeline(request: PipelineRequest) -> dict[str, Any]:
    fetch_result = await fetch_and_store(request)
    items: list[dict[str, Any]] = []
    failures: list[dict[str, str]] = []
    for news_id in fetch_result["news_ids"]:
        try:
            await create_script(news_id, custom_prompt=request.custom_prompt, llm_model=request.llm_model)
            if request.generate_audio:
                await create_audio(news_id, voice_id=request.voice_id, tts_provider=request.tts_provider)
            items.append(NewsRepository.detail_dto(NewsRepository.require_news(news_id)))
        except Exception as exc:
            failures.append({"news_id": news_id, "message": str(exc)})
            items.append(NewsRepository.detail_dto(NewsRepository.require_news(news_id)))
    return {"fetch": fetch_result, "items": items, "failures": failures}
