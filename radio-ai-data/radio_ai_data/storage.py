from __future__ import annotations

from pathlib import Path
from typing import Any

from .config import settings
import json
import time
from .db import fetch_all, fetch_one, execute, utc_now


DIRECTORY_CATEGORY_MAP = {
    "intros": ("系统通用", "片头Jingle"),
    "outros": ("系统通用", "片尾谢幕"),
    "transitions": ("系统通用", "转场音效"),
    "bgm": ("音乐频道", "背景音乐"),
    "effects": ("电子宠物频道", "事件提示音"),
    "stories": ("故事频道", "原声曲目"),
    "lessons": ("学习频道", "原声曲目"),
    "uploads": ("系统通用", "非TTS音效"),
    "general": ("系统通用", "非TTS音效"),
}

EXCLUDED_DIRS = {"preview", "tmp", "cache", "news"}


def scan_audio_assets() -> list[dict[str, Any]]:
    assets = []
    valid_exts = {".mp3", ".wav", ".aac", ".flac", ".m4a", ".ogg"}

    if not settings.audio_dir.exists():
        settings.audio_dir.mkdir(parents=True, exist_ok=True)

    for path in sorted(settings.audio_dir.rglob("*")):
        if path.is_file() and path.suffix.lower() in valid_exts:
            rel = path.relative_to(settings.audio_dir)
            parts = rel.parts
            parent_dir = parts[0] if len(parts) > 1 else "general"

            if parent_dir in EXCLUDED_DIRS or path.name.startswith("preview-") or path.name.startswith("tts-"):
                continue

            channel_cat, audio_type = DIRECTORY_CATEGORY_MAP.get(parent_dir, ("系统通用", "非TTS音效"))
            title_stem = path.stem

            assets.append({
                "id": f"scanned-{rel.as_posix().replace('/', '-')}",
                "title": title_stem,
                "category": channel_cat,
                "channelCategory": channel_cat,
                "audioType": audio_type,
                "duration": "0:10",
                "durationSeconds": 10,
                "tags": [audio_type, parent_dir],
                "usedInChannels": [f"{channel_cat}库"],
                "speakerOrSource": f"文件: {rel.as_posix()}",
                "url": f"/static/audio/{rel.as_posix()}",
            })

    return assets


def get_all_audio_assets() -> list[dict[str, Any]]:
    db_rows = fetch_all("SELECT * FROM audio_assets ORDER BY created_at DESC")
    db_assets = []
    db_urls = set()
    db_ids = set()

    for r in db_rows:
        tags = json.loads(r.get("tags_json") or "[]")
        used = json.loads(r.get("used_in_channels_json") or "[]")
        asset = {
            "id": r["id"],
            "title": r["title"],
            "category": r["category"],
            "channelCategory": r["channel_category"],
            "audioType": r["audio_type"],
            "duration": r["duration"],
            "durationSeconds": r["duration_seconds"],
            "tags": tags,
            "usedInChannels": used,
            "url": r.get("url"),
            "sourceText": r.get("source_text"),
            "ttsProvider": r.get("tts_provider"),
            "voiceId": r.get("voice_id"),
            "speakerOrSource": r.get("speaker_or_source"),
            "synthPreset": r.get("synth_preset"),
        }
        db_assets.append(asset)
        if r.get("url"):
            db_urls.add(r["url"])
        db_ids.add(r["id"])

    scanned = scan_audio_assets()
    for s in scanned:
        if s["id"] not in db_ids and s["url"] not in db_urls:
            db_assets.append(s)

    return db_assets


def save_audio_asset_record(data: dict[str, Any]) -> dict[str, Any]:
    now = utc_now()
    asset_id = data.get("id") or f"audio-{int(time.time()*1000)}"
    tags = data.get("tags", [])
    used = data.get("usedInChannels", [])
    channel_cat = data.get("channelCategory") or data.get("category") or "系统通用"
    audio_type = data.get("audioType") or "非TTS音效"
    dur = data.get("duration") or "0:10"
    dur_sec = data.get("durationSeconds") or 10

    execute(
        """INSERT OR REPLACE INTO audio_assets (
            id, title, category, channel_category, audio_type, duration, duration_seconds,
            tags_json, used_in_channels_json, url, source_text, tts_provider, voice_id,
            speaker_or_source, synth_preset, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            asset_id,
            data.get("title", "未命名音频"),
            channel_cat,
            channel_cat,
            audio_type,
            dur,
            dur_sec,
            json.dumps(tags, ensure_ascii=False),
            json.dumps(used, ensure_ascii=False),
            data.get("url"),
            data.get("sourceText"),
            data.get("ttsProvider"),
            data.get("voiceId"),
            data.get("speakerOrSource"),
            data.get("synthPreset"),
            now,
            now,
        ),
    )
    return {"status": "ok", "id": asset_id}


def delete_audio_asset_record(asset_id_or_url: str) -> dict[str, str]:
    execute("DELETE FROM audio_assets WHERE id = ? OR url = ?", (asset_id_or_url, asset_id_or_url))
    if asset_id_or_url.startswith("/static/audio/"):
        try:
            delete_audio_asset(asset_id_or_url)
        except Exception:
            pass
    return {"status": "ok", "deleted": asset_id_or_url}


def delete_audio_asset(url: str) -> dict[str, str]:
    """Delete a physical audio file given its static URL path."""
    STATIC_PREFIX = "/static/audio/"
    if not url.startswith(STATIC_PREFIX):
        raise KeyError(f"Invalid audio URL: {url}")

    rel_path = url[len(STATIC_PREFIX):]
    if ".." in rel_path:
        raise KeyError("Invalid path")

    target = (settings.audio_dir / rel_path).resolve()
    audio_dir_resolved = settings.audio_dir.resolve()
    if not str(target).startswith(str(audio_dir_resolved)):
        raise KeyError("Path not within audio directory")

    if not target.exists():
        raise KeyError(f"File not found: {rel_path}")

    target.unlink()
    return {"status": "deleted", "path": rel_path}
