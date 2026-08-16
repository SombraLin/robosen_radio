from __future__ import annotations

import base64
import json
import logging
import os
from pathlib import Path
from typing import Any
from uuid import uuid4
from fastapi import APIRouter, Query, HTTPException, UploadFile, File, Body, Depends, Response, status
import httpx
from pydantic import BaseModel, Field

from app.auth import create_admin_session, require_admin_session
from app.config import settings
from app.schemas import (
    LoginRequest,
    LoginResponse,
    ScriptGenerateRequest,
    AudioRequest,
    PreviewAudioRequest,
    GenerativeConfigUpdate,
    ScriptDraftRequest,
    ChannelCopyRequest,
)
from app.services.channel_freeze_service import freeze_channel

from radio_ai_data import (
    execute,
    fetch_all,
    fetch_one,
    get_generative_config,
    get_generative_config_public,
    update_generative_config,
    utc_now,
    NewsRepository,
    DollRepository,
    AdminUserRepository,
    get_all_audio_assets,
    save_audio_asset_record,
    delete_audio_asset_record,
)

from radio_ai_engine import generate_draft_news, generate_channel_copy

logger = logging.getLogger(__name__)

router = APIRouter(tags=["admin"])


class ScriptUpdate(BaseModel):
    text: str = Field(min_length=1, max_length=8000)


class DraftRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=500)
    category: str = "科技"
    channel_role: str = "默认新闻"


class DeleteAudioRequest(BaseModel):
    url: str


class SaveAvatarRequest(BaseModel):
    image_base64: str


# ==================== Auth Routes (Public) ====================

@router.post("/api/v1/admin/auth/login", response_model=LoginResponse)
def admin_login(req: LoginRequest, response: Response) -> dict[str, Any]:
    user = AdminUserRepository.get_by_username(req.username)
    if not user or not AdminUserRepository.verify_password(req.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )
    token = create_admin_session(req.username)
    # Set HttpOnly Session Cookie
    response.set_cookie(
        key="admin_session",
        value=token,
        max_age=settings.admin_session_lifetime_seconds,
        httponly=True,
        samesite="lax",
        secure=False,  # Set true if HTTPS in production
    )
    return {
        "status": "ok",
        "username": req.username,
        "token": token,
    }


@router.post("/api/v1/admin/auth/logout")
def admin_logout(response: Response) -> dict[str, str]:
    response.delete_cookie(key="admin_session")
    return {"status": "ok", "message": "已退出登录"}


@router.get("/api/v1/admin/auth/me")
def admin_me(current_user: dict[str, Any] = Depends(require_admin_session)) -> dict[str, Any]:
    return {"status": "ok", "user": current_user}


# ==================== Protected Admin News Routes ====================

@router.get("/api/v1/admin/news")
def list_news(
    tag: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    audio_status: str | None = None,
    keyword: str | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    include_deleted: bool = False,
    current_user: dict[str, Any] = Depends(require_admin_session),
) -> dict[str, Any]:
    where = ["deleted_at IS NULL"] if not include_deleted else ["1=1"]
    params: list[Any] = []
    if tag:
        where.append("tag = ?")
        params.append(tag)
    if status_filter:
        where.append("script_status = ?")
        params.append(status_filter)
    if audio_status:
        where.append("audio_status = ?")
        params.append(audio_status)
    if keyword:
        where.append("(title LIKE ? OR clean_summary LIKE ? OR script_text LIKE ?)")
        kw = f"%{keyword}%"
        params.extend([kw, kw, kw])

    clause = " AND ".join(where)
    total_row = fetch_one(f"SELECT COUNT(*) AS c FROM news WHERE {clause}", tuple(params))
    total = total_row["c"] if total_row else 0

    params.extend([limit, offset])
    rows = fetch_all(
        f"SELECT * FROM news WHERE {clause} ORDER BY updated_at DESC LIMIT ? OFFSET ?",
        tuple(params),
    )
    items = [NewsRepository.summary_dto(r) for r in rows]
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/api/v1/admin/news/trash")
def list_trash_news(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: dict[str, Any] = Depends(require_admin_session),
) -> dict[str, Any]:
    total_row = fetch_one("SELECT COUNT(*) AS c FROM news WHERE deleted_at IS NOT NULL")
    total = total_row["c"] if total_row else 0
    rows = fetch_all(
        "SELECT * FROM news WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC LIMIT ? OFFSET ?",
        (limit, offset),
    )
    items = [NewsRepository.summary_dto(r) for r in rows]
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/api/v1/admin/news/{news_id}")
def get_news_detail(
    news_id: str,
    current_user: dict[str, Any] = Depends(require_admin_session),
) -> dict[str, Any]:
    row = NewsRepository.require_news(news_id)
    return NewsRepository.detail_dto(row)


@router.put("/api/v1/admin/news/{news_id}/script")
def update_news_script(
    news_id: str,
    req: ScriptUpdate,
    current_user: dict[str, Any] = Depends(require_admin_session),
) -> dict[str, Any]:
    NewsRepository.require_news(news_id)
    execute(
        """UPDATE news SET
           script_text = ?,
           script_status = 'ready',
           audio_status = CASE WHEN audio_path IS NULL THEN 'missing' ELSE 'stale' END,
           updated_at = ?
           WHERE id = ?""",
        (req.text, utc_now(), news_id),
    )
    return NewsRepository.detail_dto(NewsRepository.require_news(news_id))


@router.delete("/api/v1/admin/news/{news_id}")
def soft_delete_news(
    news_id: str,
    current_user: dict[str, Any] = Depends(require_admin_session),
) -> dict[str, Any]:
    NewsRepository.require_news(news_id)
    now = utc_now()
    execute("UPDATE news SET deleted_at = ?, updated_at = ? WHERE id = ?", (now, now, news_id))
    return {"status": "ok", "id": news_id, "deleted_at": now}


@router.delete("/api/v1/admin/news/{news_id}/permanent")
def hard_delete_news(
    news_id: str,
    current_user: dict[str, Any] = Depends(require_admin_session),
) -> dict[str, Any]:
    row = NewsRepository.require_news(news_id)
    if row.get("audio_path"):
        try:
            Path(row["audio_path"]).unlink(missing_ok=True)
        except Exception:
            pass
    execute("DELETE FROM news WHERE id = ?", (news_id,))
    return {"status": "ok", "id": news_id, "permanently_deleted": True}


@router.post("/api/v1/admin/news/{news_id}/restore")
def restore_news(
    news_id: str,
    current_user: dict[str, Any] = Depends(require_admin_session),
) -> dict[str, Any]:
    NewsRepository.require_news(news_id)
    execute("UPDATE news SET deleted_at=NULL, updated_at=? WHERE id=?", (utc_now(), news_id))
    return NewsRepository.detail_dto(NewsRepository.require_news(news_id))


# ==================== Protected Config & Assets Routes ====================

@router.get("/api/v1/radio-ai/generative-config")
def get_gen_config(
    current_user: dict[str, Any] = Depends(require_admin_session),
) -> dict[str, Any]:
    # Return public masked version
    return get_generative_config_public()


@router.put("/api/v1/radio-ai/generative-config")
def update_gen_config(
    req: GenerativeConfigUpdate,
    current_user: dict[str, Any] = Depends(require_admin_session),
) -> dict[str, Any]:
    update_generative_config(req.model_dump(exclude_unset=True))
    return get_generative_config_public()


@router.get("/api/v1/radio-ai/audio-assets")
def get_audio_assets(
    current_user: dict[str, Any] = Depends(require_admin_session),
) -> list[dict[str, Any]]:
    return get_all_audio_assets()


@router.post("/api/v1/radio-ai/audio-assets")
def create_or_update_audio_asset(
    data: dict[str, Any] = Body(...),
    current_user: dict[str, Any] = Depends(require_admin_session),
) -> dict[str, Any]:
    return save_audio_asset_record(data)


@router.delete("/api/v1/radio-ai/audio-assets/{asset_id}")
def delete_audio_asset_endpoint(
    asset_id: str,
    current_user: dict[str, Any] = Depends(require_admin_session),
) -> dict[str, str]:
    return delete_audio_asset_record(asset_id)


@router.post("/api/v1/radio-ai/audio-assets/upload")
async def upload_audio_asset(
    file: UploadFile = File(...),
    current_user: dict[str, Any] = Depends(require_admin_session),
) -> dict[str, Any]:
    upload_dir = settings.audio_dir / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    original_filename = Path(file.filename or "upload.mp3").name
    stem = Path(original_filename).stem
    ext = Path(original_filename).suffix or ".mp3"

    unique_filename = f"{stem}_{uuid4().hex[:6]}{ext}"
    target_path = upload_dir / unique_filename

    content = await file.read()
    target_path.write_bytes(content)

    return {
        "status": "success",
        "filename": unique_filename,
        "url": f"/static/audio/uploads/{unique_filename}",
        "size_bytes": len(content),
    }


# ==================== Protected Dolls & Channels Routes ====================

@router.get("/api/v1/radio-ai/dolls")
def list_dolls(
    current_user: dict[str, Any] = Depends(require_admin_session),
) -> list[dict[str, Any]]:
    return DollRepository.get_all_dolls()


@router.get("/api/v1/radio-ai/dolls/{doll_id}")
def get_doll(
    doll_id: str,
    current_user: dict[str, Any] = Depends(require_admin_session),
) -> dict[str, Any]:
    doll = DollRepository.get_doll(doll_id)
    if not doll:
        raise HTTPException(status_code=404, detail="玩偶不存在")
    return doll


@router.post("/api/v1/radio-ai/dolls/{doll_id}")
def save_doll(
    doll_id: str,
    data: dict[str, Any] = Body(...),
    current_user: dict[str, Any] = Depends(require_admin_session),
) -> dict[str, Any]:
    return DollRepository.save_doll(doll_id, data)


@router.get("/api/v1/radio-ai/dolls/{doll_id}/channels")
def get_doll_channels(
    doll_id: str,
    current_user: dict[str, Any] = Depends(require_admin_session),
) -> list[dict[str, Any]]:
    return DollRepository.get_channels_by_doll(doll_id)


@router.post("/api/v1/radio-ai/dolls/{doll_id}/channels/{channel_id}")
def save_channel_endpoint(
    doll_id: str,
    channel_id: str,
    data: dict[str, Any] = Body(...),
    current_user: dict[str, Any] = Depends(require_admin_session),
) -> dict[str, Any]:
    return DollRepository.save_channel(doll_id, channel_id, data)


@router.post("/api/v1/radio-ai/dolls/{doll_id}/channels/{channel_id}/freeze")
async def freeze_channel_endpoint(
    doll_id: str,
    channel_id: str,
    data: dict[str, Any] = Body(...),
    current_user: dict[str, Any] = Depends(require_admin_session),
) -> dict[str, Any]:
    return await freeze_channel(doll_id, channel_id, data)


@router.delete("/api/v1/radio-ai/dolls/{doll_id}/channels/{channel_id}")
def delete_channel_endpoint(
    doll_id: str,
    channel_id: str,
    current_user: dict[str, Any] = Depends(require_admin_session),
) -> dict[str, str]:
    return DollRepository.delete_channel(doll_id, channel_id)


@router.post("/api/v1/radio-ai/dolls/{doll_id}/avatar")
def update_doll_avatar(
    doll_id: str,
    req: SaveAvatarRequest,
    current_user: dict[str, Any] = Depends(require_admin_session),
) -> dict[str, Any]:
    try:
        return DollRepository.save_avatar(doll_id, req.image_base64)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/v1/radio-ai/dolls/{doll_id}/channels/{channel_id}/manifest")
def get_channel_manifest(
    doll_id: str,
    channel_id: str,
    current_user: dict[str, Any] = Depends(require_admin_session),
) -> dict[str, Any]:
    manifest_path = settings.audio_dir / "channels" / doll_id / channel_id / "playlist_resource.json"
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="ESP32 resource manifest not found")
    with open(manifest_path, "r", encoding="utf-8") as f:
        return json.load(f)


# ==================== Protected Logs & Diagnostics ====================

@router.get("/api/v1/admin/logs")
def get_system_logs(
    source: str = Query(default="all", description="Log source: all | backend | tts | crawler"),
    level: str = Query(default="all", description="Log level: all | error | warn | info"),
    limit: int = Query(default=200, ge=10, le=1000),
    keyword: str | None = None,
    current_user: dict[str, Any] = Depends(require_admin_session),
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
                    "id": f"{src}-{i}",
                    "source": src,
                    "level": log_level,
                    "text": line_str,
                    "timestamp": utc_now(),
                })
        except Exception as e:
            logger.warning(f"Error reading log file {file_path}: {e}")

    return {
        "items": items[-limit:],
        "total": len(items),
    }


# Mount health diagnostic sub-router
from app.admin.health import router as health_router
router.include_router(health_router)
