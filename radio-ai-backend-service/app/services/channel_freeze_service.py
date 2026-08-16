from __future__ import annotations

import base64
import ipaddress
import json
import logging
import os
from pathlib import Path
import shutil
import socket
from typing import Any
from urllib.parse import urlsplit
import httpx

from app.config import settings
from radio_ai_data import (
    DollRepository,
    get_generative_config,
    safe_resolve_audio_path,
    utc_now,
)

logger = logging.getLogger(__name__)


def is_public_http_url(url: str) -> bool:
    """Validate external URL against SSRF and private network access."""
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        return False
    try:
        ip = ipaddress.ip_address(socket.gethostbyname(parts.hostname))
    except (socket.gaierror, ValueError):
        return False
    return not (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved)


async def resolve_playlist_item_audio(
    doll_id: str,
    channel_id: str,
    item: dict[str, Any],
    channel_dir: Path,
    data: dict[str, Any],
) -> tuple[str | None, int, int]:
    """
    Resolve and materialize physical audio file for a playlist item.
    Returns (final_audio_url, duration_seconds, file_size_bytes).
    """
    item_id = str(item.get("id") or f"node_{os.urandom(4).hex()}")
    safe_item_id = "".join(c if c.isalnum() or c in "-_" else "_" for c in item_id)
    filename_stem = f"node_{safe_item_id}"

    audio_url = item.get("audioUrl") or item.get("audio_url") or ""
    final_audio_url = None
    file_size_bytes = 0

    # 1. Local static path
    if audio_url and "/static/audio/" in audio_url:
        rel_path_str = audio_url.split("/static/audio/", 1)[1].split("?")[0]
        try:
            source_file = safe_resolve_audio_path(rel_path_str)
            if source_file.is_file():
                ext = source_file.suffix or ".mp3"
                target_file = channel_dir / f"{filename_stem}{ext}"
                if source_file != target_file:
                    shutil.copy2(source_file, target_file)
                file_size_bytes = target_file.stat().st_size
                final_audio_url = f"/static/audio/channels/{doll_id}/{channel_id}/{target_file.name}"
        except ValueError as e:
            logger.warning(f"Rejected insecure audio path {rel_path_str}: {e}")

    # 2. External HTTP/HTTPS URL with SSRF whitelist validation
    elif audio_url and (audio_url.startswith("http://") or audio_url.startswith("https://")):
        if is_public_http_url(audio_url):
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
                logger.warning(f"Failed to download public audio from {audio_url}: {e}")
        else:
            logger.warning(f"Blocked private/invalid external URL for node {item_id}: {audio_url}")

    # 3. Base64 audio data
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

    # 4. Fallback: TTS synthesis via TTS microservice
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
                    resp = await client.post(f"{settings.tts_service_url}/api/generate", json=payload)
                    if resp.status_code == 200:
                        ct = resp.headers.get("content-type", "")
                        ext = ".mp3" if "mpeg" in ct else ".wav"
                        target_file = channel_dir / f"{filename_stem}{ext}"
                        target_file.write_bytes(resp.content)
                        file_size_bytes = len(resp.content)
                        final_audio_url = f"/static/audio/channels/{doll_id}/{channel_id}/{target_file.name}"
            except Exception as e:
                logger.warning(f"TTS generation fallback failed for node {item_id}: {e}")

    # 5. Fallback: existing file in channel directory
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

    return final_audio_url, duration_seconds, file_size_bytes


async def freeze_channel(
    doll_id: str,
    channel_id: str,
    data: dict[str, Any],
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

        final_audio_url, duration_seconds, file_size_bytes = await resolve_playlist_item_audio(
            doll_id=doll_id,
            channel_id=channel_id,
            item=item,
            channel_dir=channel_dir,
            data=data,
        )

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

    # Save to database
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
