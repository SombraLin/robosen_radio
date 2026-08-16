from __future__ import annotations

import base64
import json
import logging
import os
from pathlib import Path
import shutil
from typing import Any
from uuid import uuid4
from fastapi import APIRouter, Query, HTTPException, UploadFile, File, Body
import httpx
from pydantic import BaseModel, Field

from app.config import settings

logger = logging.getLogger(__name__)

try:
    from radio_ai_data import (
        execute,
        fetch_all,
        fetch_one,
        get_generative_config,
        update_generative_config,
        utc_now,
        NewsRepository,
        DollRepository,
        get_all_audio_assets,
        save_audio_asset_record,
        delete_audio_asset_record,
    )
except ImportError:
    import sys
    sys.path.append(str(Path(__file__).resolve().parents[3] / "radio-ai-data"))
    from radio_ai_data import (
        execute,
        fetch_all,
        fetch_one,
        get_generative_config,
        update_generative_config,
        utc_now,
        NewsRepository,
        DollRepository,
        get_all_audio_assets,
        save_audio_asset_record,
        delete_audio_asset_record,
    )

try:
    from radio_ai_engine import generate_draft_news, generate_channel_copy
except ImportError:
    import sys
    sys.path.append(str(Path(__file__).resolve().parents[3] / "radio-ai-engine"))
    from radio_ai_engine import generate_draft_news, generate_channel_copy


router = APIRouter(tags=["admin"])


class ScriptUpdate(BaseModel):
    text: str = Field(min_length=1, max_length=8000)


class AudioRequest(BaseModel):
    upload_to_oss: bool = False
    voice_id: str | None = None
    tts_provider: str | None = None


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


class DraftRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=500)
    category: str = "科技"
    channel_role: str = "默认新闻"


class ChannelCopyRequest(BaseModel):
    doll_name: str = Field(min_length=1, max_length=100)
    style_keyword: str = Field(default="温暖自然", max_length=200)


class DeleteAudioRequest(BaseModel):
    url: str


class SaveAvatarRequest(BaseModel):
    image_base64: str


@router.get("/api/v1/admin/dashboard")
def dashboard() -> dict[str, Any]:
    rows = fetch_all("SELECT * FROM news WHERE deleted_at IS NULL ORDER BY updated_at DESC")
    counts: dict[str, int] = {}
    for row in rows:
        counts[row["tag"]] = counts.get(row["tag"], 0) + 1
    return {
        "category_counts": counts,
        "recent_news": [NewsRepository.summary_dto(row) for row in rows[:10]],
    }


@router.get("/api/v1/admin/news")
def list_news(
    keyword: str | None = None,
    tag: str | None = None,
    script_status: str | None = None,
    audio_status: str | None = None,
    trash: bool = False,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, ge=1, le=200),
) -> dict[str, Any]:
    clauses = ["deleted_at IS NOT NULL" if trash else "deleted_at IS NULL"]
    params: list[Any] = []
    if keyword:
        clauses.append("(title LIKE ? OR source LIKE ? OR clean_summary LIKE ?)")
        value = f"%{keyword}%"
        params.extend([value, value, value])
    for column, value in (("tag", tag), ("script_status", script_status), ("audio_status", audio_status)):
        if value:
            clauses.append(f"{column} = ?")
            params.append(value)
    where = " AND ".join(clauses)
    total = fetch_one(f"SELECT COUNT(*) AS count FROM news WHERE {where}", tuple(params))["count"]
    rows = fetch_all(
        f"SELECT * FROM news WHERE {where} ORDER BY updated_at DESC LIMIT ? OFFSET ?",
        tuple([*params, page_size, (page - 1) * page_size]),
    )
    return {
        "items": [NewsRepository.summary_dto(row) for row in rows],
        "page": page,
        "page_size": page_size,
        "total": total,
        "pages": max(1, (total + page_size - 1) // page_size),
    }


@router.get("/api/v1/admin/news/{news_id}")
def news_detail(news_id: str) -> dict[str, Any]:
    return NewsRepository.detail_dto(NewsRepository.require_news(news_id))


@router.patch("/api/v1/admin/news/{news_id}/script")
def update_script(news_id: str, request: ScriptUpdate) -> dict[str, Any]:
    NewsRepository.require_news(news_id)
    execute(
        "UPDATE news SET script_text=?, script_status='ready', audio_status=CASE WHEN audio_path IS NULL THEN 'missing' ELSE 'stale' END, updated_at=? WHERE id=?",
        (request.text.strip(), utc_now(), news_id),
    )
    return NewsRepository.detail_dto(NewsRepository.require_news(news_id))


@router.post("/api/v1/admin/news/{news_id}/trash")
def trash_news(news_id: str) -> dict[str, Any]:
    NewsRepository.require_news(news_id)
    execute("UPDATE news SET deleted_at=?, updated_at=? WHERE id=?", (utc_now(), utc_now(), news_id))
    return NewsRepository.detail_dto(NewsRepository.require_news(news_id))


@router.post("/api/v1/admin/news/{news_id}/restore")
def restore_news(news_id: str) -> dict[str, Any]:
    NewsRepository.require_news(news_id)
    execute("UPDATE news SET deleted_at=NULL, updated_at=? WHERE id=?", (utc_now(), news_id))
    return NewsRepository.detail_dto(NewsRepository.require_news(news_id))


@router.get("/api/v1/radio-ai/generative-config")
def get_gen_config() -> dict[str, Any]:
    return get_generative_config()


@router.put("/api/v1/radio-ai/generative-config")
def update_gen_config(req: GenerativeConfigUpdate) -> dict[str, Any]:
    return update_generative_config(req.model_dump(exclude_unset=True))


@router.get("/api/v1/radio-ai/audio-assets")
def get_audio_assets() -> list[dict[str, Any]]:
    return get_all_audio_assets()


@router.post("/api/v1/radio-ai/audio-assets")
def create_or_update_audio_asset(data: dict[str, Any] = Body(...)) -> dict[str, Any]:
    return save_audio_asset_record(data)


@router.get("/api/v1/radio-ai/dolls/{doll_id}/channels/{channel_id}/manifest")
def get_channel_manifest(doll_id: str, channel_id: str) -> dict[str, Any]:
    manifest_path = settings.audio_dir / "channels" / doll_id / channel_id / "playlist_resource.json"
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="ESP32 resource manifest not found")
    import json
    with open(manifest_path, "r", encoding="utf-8") as f:
        return json.load(f)


@router.post("/api/v1/radio-ai/audio-assets/upload")
async def upload_audio_asset(file: UploadFile = File(...)) -> dict[str, Any]:
    upload_dir = settings.audio_dir / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    original_filename = Path(file.filename or "upload.mp3").name
    stem = Path(original_filename).stem
    ext = Path(original_filename).suffix or ".mp3"

    unique_filename = f"{stem}_{uuid4().hex[:6]}{ext}"
    target_path = upload_dir / unique_filename

    content = await file.read()
    with open(target_path, "wb") as f:
        f.write(content)

    rel_path = target_path.relative_to(settings.audio_dir)
    return {
        "status": "ok",
        "url": f"/static/audio/{rel_path.as_posix()}",
        "filename": original_filename,
        "size_bytes": len(content),
    }


@router.delete("/api/v1/radio-ai/audio-assets")
def remove_audio_asset(request: DeleteAudioRequest) -> dict[str, str]:
    return delete_audio_asset_record(request.url)


@router.post("/api/v1/radio-ai/drafts/news")
async def draft_news(request: DraftRequest) -> dict[str, Any]:
    return await generate_draft_news(request.topic, category=request.category, channel_role=request.channel_role)


@router.post("/api/v1/radio-ai/drafts/channel-copy")
def draft_copy(request: ChannelCopyRequest) -> dict[str, str]:
    return generate_channel_copy(request.doll_name, style_keyword=request.style_keyword)


@router.get("/api/v1/radio-ai/dolls")
def list_dolls() -> list[dict[str, Any]]:
    return DollRepository.get_all_dolls()


@router.put("/api/v1/radio-ai/dolls/{doll_id}")
def save_doll_endpoint(doll_id: str, data: dict[str, Any]) -> dict[str, Any]:
    return DollRepository.save_doll(doll_id, data)


@router.delete("/api/v1/radio-ai/dolls/{doll_id}")
def delete_doll_endpoint(doll_id: str) -> dict[str, str]:
    return DollRepository.delete_doll(doll_id)


@router.put("/api/v1/radio-ai/dolls/{doll_id}/channels/{channel_id}")
def save_channel_endpoint(doll_id: str, channel_id: str, data: dict[str, Any] = Body(...)) -> dict[str, Any]:
    return DollRepository.save_channel(doll_id, channel_id, data)


@router.post("/api/v1/radio-ai/dolls/{doll_id}/channels/{channel_id}/freeze")
async def freeze_channel_endpoint(
    doll_id: str,
    channel_id: str,
    data: dict[str, Any] = Body(...),
) -> dict[str, Any]:
    channel_dir = settings.audio_dir / "channels" / doll_id / channel_id
    channel_dir.mkdir(parents=True, exist_ok=True)

    playlist = data.get("playlist") or []
    manifest_playlist = []
    updated_playlist = []

    for idx, item in enumerate(playlist):
        item_id = str(item.get("id") or f"p{idx+1}")
        safe_item_id = "".join(c if c.isalnum() or c in "-_" else "_" for c in item_id)
        filename_stem = f"node_{safe_item_id}"

        audio_url = item.get("audioUrl") or item.get("audio_url") or ""
        final_audio_url = None
        file_size_bytes = 0
        ext = ".mp3"

        # 1. Check if audio_url is a local static path
        if audio_url and "/static/audio/" in audio_url:
            rel_path_str = audio_url.split("/static/audio/", 1)[1].split("?")[0]
            source_file = (settings.audio_dir / rel_path_str).resolve()
            if source_file.is_file():
                ext = source_file.suffix or ".mp3"
                target_file = channel_dir / f"{filename_stem}{ext}"
                if source_file != target_file:
                    shutil.copy2(source_file, target_file)
                file_size_bytes = target_file.stat().st_size
                final_audio_url = f"/static/audio/channels/{doll_id}/{channel_id}/{target_file.name}"

        # 2. Check if audio_url is an external HTTP/HTTPS URL
        elif audio_url and (audio_url.startswith("http://") or audio_url.startswith("https://")):
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.get(audio_url)
                    if resp.status_code == 200:
                        ct = resp.headers.get("content-type", "")
                        ext = ".wav" if "wav" in ct else ".mp3"
                        target_file = channel_dir / f"{filename_stem}{ext}"
                        target_file.write_bytes(resp.content)
                        file_size_bytes = len(resp.content)
                        final_audio_url = f"/static/audio/channels/{doll_id}/{channel_id}/{target_file.name}"
            except Exception as e:
                logger.warning(f"Failed to download audio from {audio_url}: {e}")

        # 3. Check if audio_url is base64 data
        elif audio_url and audio_url.startswith("data:audio/"):
            try:
                b64_part = audio_url.split(",", 1)[1] if "," in audio_url else audio_url
                raw_bytes = base64.b64decode(b64_part)
                target_file = channel_dir / f"{filename_stem}.mp3"
                target_file.write_bytes(raw_bytes)
                file_size_bytes = len(raw_bytes)
                final_audio_url = f"/static/audio/channels/{doll_id}/{channel_id}/{target_file.name}"
            except Exception as e:
                logger.warning(f"Failed to decode base64 audio: {e}")

        # 4. If still no valid physical file, try TTS synthesis if text snippet exists
        if not final_audio_url:
            text_to_speak = item.get("contentSnippet") or item.get("script_text") or item.get("title") or ""
            if text_to_speak.strip() and not text_to_speak.startswith("["):
                try:
                    gen_cfg = get_generative_config()
                    configured_key = gen_cfg.get("dashscope_api_key") or os.getenv("DASHSCOPE_API_KEY")
                    voice = item.get("voice_id") or data.get("speaker") or gen_cfg.get("default_voice_id")
                    provider = item.get("tts_provider") or data.get("ttsProvider") or gen_cfg.get("default_tts_provider", "edge")
                    payload = {
                        "text": text_to_speak.strip(),
                        "voice_id": voice,
                        "provider": provider,
                        "api_key": configured_key,
                    }
                    async with httpx.AsyncClient(timeout=60.0) as client:
                        resp = await client.post("http://127.0.0.1:8018/api/generate", json=payload)
                        if resp.status_code == 200:
                            ct = resp.headers.get("content-type", "")
                            ext = ".mp3" if "mpeg" in ct else ".wav"
                            target_file = channel_dir / f"{filename_stem}{ext}"
                            target_file.write_bytes(resp.content)
                            file_size_bytes = len(resp.content)
                            final_audio_url = f"/static/audio/channels/{doll_id}/{channel_id}/{target_file.name}"
                except Exception as e:
                    logger.warning(f"TTS generation failed for node {item_id}: {e}")

        # 5. Fallback: check if target file already exists in channel_dir
        if not final_audio_url:
            candidates = list(channel_dir.glob(f"{filename_stem}.*"))
            if candidates:
                existing_file = candidates[0]
                file_size_bytes = existing_file.stat().st_size
                final_audio_url = f"/static/audio/channels/{doll_id}/{channel_id}/{existing_file.name}"
            else:
                final_audio_url = audio_url or None

        # Determine duration
        duration_seconds = item.get("durationSeconds") or item.get("duration_seconds")
        if not duration_seconds:
            text_len = len(item.get("contentSnippet") or item.get("title") or "")
            duration_seconds = max(2, round(text_len / 4)) if text_len > 0 else 5

        mins = duration_seconds // 60
        secs = duration_seconds % 60
        duration_formatted = f"{mins}:{secs:02d}"

        updated_item = {
            **item,
            "audioUrl": final_audio_url,
            "durationSeconds": duration_seconds,
            "durationFormatted": item.get("durationFormatted") or duration_formatted,
        }
        updated_playlist.append(updated_item)

        manifest_entry = {
            "item_id": item_id,
            "type": item.get("type", "audio"),
            "title": item.get("title", ""),
            "audio_url": final_audio_url,
            "local_filename": Path(final_audio_url).name if final_audio_url else f"{filename_stem}.mp3",
            "file_size_bytes": file_size_bytes,
            "duration_seconds": duration_seconds,
            "speaker_role": item.get("speakerRole") or item.get("speaker_role", ""),
        }
        manifest_playlist.append(manifest_entry)

    total_items = len(manifest_playlist)
    total_duration = sum(entry["duration_seconds"] for entry in manifest_playlist)

    manifest_data = {
        "version": "1.0.0",
        "doll_id": doll_id,
        "channel_id": channel_id,
        "channel_name": data.get("channel_name") or data.get("name", ""),
        "category": data.get("category", "新闻频道"),
        "updated_at": utc_now(),
        "total_items": total_items,
        "total_duration_seconds": total_duration,
        "playlist": manifest_playlist,
    }

    manifest_file = channel_dir / "playlist_resource.json"
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, ensure_ascii=False, indent=2)

    # Save to channel DB
    channel_record = {
        **data,
        "playlist": updated_playlist,
    }
    DollRepository.save_channel(doll_id, channel_id, channel_record)

    return {
        "status": "success",
        "doll_id": doll_id,
        "channel_id": channel_id,
        "manifest_url": f"/static/audio/channels/{doll_id}/{channel_id}/playlist_resource.json",
        "playlist": updated_playlist,
        "manifest": manifest_data,
    }


@router.delete("/api/v1/radio-ai/dolls/{doll_id}/channels/{channel_id}")
def delete_channel_endpoint(doll_id: str, channel_id: str) -> dict[str, str]:
    return DollRepository.delete_channel(doll_id, channel_id)


@router.post("/api/v1/radio-ai/dolls/{doll_id}/avatar")
def update_doll_avatar(doll_id: str, req: SaveAvatarRequest) -> dict[str, Any]:
    return DollRepository.save_avatar(doll_id, req.image_base64)


@router.get("/api/v1/admin/logs")
def get_system_logs(
    source: str = Query(default="all", description="Log source: all | backend | tts | crawler"),
    level: str = Query(default="all", description="Log level: all | error | warn | info"),
    limit: int = Query(default=200, ge=10, le=1000),
    keyword: str | None = None,
) -> dict[str, Any]:
    base_dir = Path(__file__).resolve().parents[3]
    logs_dir = base_dir / "logs"
    log_files = {
        "backend": logs_dir / "backend.log",
        "tts": logs_dir / "tts_api.log",
        "crawler": logs_dir / "crawler_worker.log",
    }

    items = []
    sources_to_read = [source] if source in log_files else ["backend", "tts", "crawler"]

    for src in sources_to_read:
        file_path = log_files.get(src)
        if not file_path or not file_path.exists():
            continue
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()[-limit:]
            for i, line in enumerate(lines):
                line_str = line.strip()
                if not line_str:
                    continue
                if keyword and keyword.lower() not in line_str.lower():
                    continue

                log_level = "info"
                line_upper = line_str.upper()
                if "ERROR" in line_upper or "EXCEPTION" in line_upper or "CRITICAL" in line_upper or " 500 " in line_upper or " 404 " in line_upper:
                    log_level = "error"
                elif "WARN" in line_upper or "WARNING" in line_upper or " 400 " in line_upper:
                    log_level = "warn"
                elif "SUCCESS" in line_upper or " 200 OK" in line_upper or " 200 " in line_upper:
                    log_level = "success"

                if level != "all" and log_level != level:
                    continue

                items.append({
                    "id": f"{src}-{i}-{abs(hash(line_str))}",
                    "source": src,
                    "level": log_level,
                    "text": line_str,
                    "timestamp": utc_now(),
                })
        except Exception as e:
            print(f"Error reading log file {file_path}: {e}")

    return {
        "items": items[-limit:],
        "total": len(items),
    }

