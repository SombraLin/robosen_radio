from __future__ import annotations

import base64
import json
from pathlib import Path
import time
from typing import Any

from .config import settings
from .db import fetch_all, fetch_one, execute, utc_now


DOLL_NAME_MAP: dict[str, str] = {
    "ROBOSEN-BASIC-LIGHT": "通用机器人",
    "MINI-LOTSO": "草莓熊 Lotso",
    "MINI-ROBOT-A2": "蜡笔小新 A2 新生无奈",
    "MINI-ROBOT-A4": "蜡笔小新 A4 新花路放",
    "MINI-ROBOT-A1": "蜡笔小新 A1 新高气傲",
    "MINI-ROBOT-A3": "蜡笔小新 A3 新驰神往",
    "XWZ-O-WLGZ": "樱桃小丸子 丸皮公主",
    "XWZ-O-WPJL": "樱桃小丸子 丸皮精灵",
    "XWZ-O-WQGJ": "樱桃小丸子 丸趣歌姬",
    "XWZ-O-WQBH": "樱桃小丸子 丸全不会",
    "MINI-WOODY": "胡迪 Woody",
    "HD-O-WJZDY5": "胡迪 Woody (自定义)",
    "MINI-ALIEN": "三眼仔 Alien",
    "MINI-WALLE": "瓦力 Walle",
    "MINI-REX": "抱抱龙 Rex",
    "MINI-JESSIE": "翠西 Jessie",
    "MINI-BUZZ": "巴斯光年 Buzz",
    "BSGN-O-WJZDY5": "巴斯光年 Buzz (自定义)",
    "MINI-EVE": "伊娃 Eve",
    "ZMS-O-XHR3": "小黄人M3导演 James",
    "HL-O-XHR3": "小黄人M3摄影师 Henry",
    "LUCKY-CHEST": "幸运宝箱",
}


class NewsRepository:
    @staticmethod
    def require_news(news_id: str) -> dict[str, Any]:
        row = fetch_one("SELECT * FROM news WHERE id = ?", (news_id,))
        if not row:
            raise KeyError(f"新闻不存在: {news_id}")
        return row

    @staticmethod
    def audio_dto(row: dict[str, Any]) -> dict[str, Any]:
        audio_path = row.get("audio_path")
        if audio_path:
            p = Path(audio_path)
            try:
                rel = p.relative_to(settings.audio_dir)
                local_url = f"/static/audio/{rel}"
            except ValueError:
                local_url = f"/static/audio/{p.name}"
        else:
            local_url = None

        return {
            "id": row["id"] if audio_path else None,
            "status": row.get("audio_status") or "missing",
            "upload_status": "local" if audio_path else "not_uploaded",
            "local_url": local_url,
            "duration_seconds": row.get("audio_duration_seconds"),
            "voice_id": row.get("voice_id"),
            "failure_message": row.get("failure_message") if row.get("failure_stage") == "audio" else None,
        }

    @staticmethod
    def summary_dto(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "title": row["title"],
            "source": row["source"],
            "tag": row["tag"],
            "published_at": row.get("published_at"),
            "script_status": row["script_status"],
            "audio_status": row["audio_status"],
            "commentary_count": 0,
            "commentary_ready_count": 0,
            "updated_at": row["updated_at"],
            "deleted_at": row.get("deleted_at"),
        }

    @staticmethod
    def detail_dto(row: dict[str, Any]) -> dict[str, Any]:
        return {
            **NewsRepository.summary_dto(row),
            "url": row.get("url"),
            "raw_summary": row.get("raw_summary"),
            "language": row.get("language") or "zh-CN",
            "script_text": row.get("script_text") or "",
            "custom_prompt": row.get("custom_prompt"),
            "llm_model": row.get("llm_model"),
            "tts_provider": row.get("tts_provider"),
            "audio": NewsRepository.audio_dto(row),
            "commentaries": [],
        }


class DollRepository:
    @staticmethod
    def get_all_dolls() -> list[dict[str, Any]]:
        doll_rows = fetch_all("SELECT * FROM dolls ORDER BY created_at ASC")
        channel_rows = fetch_all("SELECT * FROM channels ORDER BY created_at ASC")

        channels_by_doll: dict[str, list[dict[str, Any]]] = {}
        for ch in channel_rows:
            d_id = ch["doll_id"]
            if d_id not in channels_by_doll:
                channels_by_doll[d_id] = []

            categories = json.loads(ch["categories_json"] or "[]")
            playlist = json.loads(ch["playlist_json"] or "[]")

            channels_by_doll[d_id].append({
                "id": ch["id"],
                "channel_id": ch["channel_id"],
                "doll_id": ch["doll_id"],
                "model_name": ch["doll_id"],
                "name": ch["name"],
                "channel_name": ch["name"],
                "code": ch["code"],
                "category": ch["category"],
                "categories": categories,
                "prompt": ch["prompt"],
                "introScript": ch["intro_script"],
                "outroScript": ch["outro_script"],
                "isLive": bool(ch["is_live"]),
                "playlist": playlist,
                "ttsProvider": ch.get("tts_provider") or "edge",
                "speaker": ch.get("speaker"),
                "llmModel": ch.get("llm_model") or "qwen-plus",
            })

        result = []
        for d in doll_rows:
            d_key = d["doll_id"]
            result.append({
                "id": d["id"],
                "doll_id": d["doll_id"],
                "name": d["name"],
                "stationCode": d["station_code"],
                "tagline": d["tagline"],
                "roleTitle": d["role_title"],
                "status": d["status"],
                "avatarUrl": d["avatar_url"],
                "prompt": d["prompt"],
                "series": d["series"],
                "speaker": d["speaker"],
                "agentAppId": d["agent_app_id"],
                "introScript": d["intro_script"],
                "outroScript": d["outro_script"],
                "ttsProvider": d.get("tts_provider") or "edge",
                "llmModel": d.get("llm_model") or "qwen-plus",
                "channels": channels_by_doll.get(d_key, []),
            })
        return result

    @staticmethod
    def save_doll(target_key: str, data: dict[str, Any]) -> dict[str, Any]:
        now = utc_now()
        doll_id_val = data.get("doll_id") or target_key
        record_id = data.get("id") or target_key

        existing = fetch_one("SELECT * FROM dolls WHERE id = ? OR doll_id = ?", (target_key, target_key))
        if existing:
            execute(
                """UPDATE dolls SET
                   doll_id = ?, name = ?, station_code = ?, tagline = ?, role_title = ?,
                   status = ?, avatar_url = ?, prompt = ?, series = ?, speaker = ?,
                   agent_app_id = ?, intro_script = ?, outro_script = ?, tts_provider = ?,
                   llm_model = ?, updated_at = ?
                   WHERE id = ? OR doll_id = ?""",
                (
                    doll_id_val,
                    data.get("name", ""),
                    data.get("stationCode", ""),
                    data.get("tagline", ""),
                    data.get("roleTitle", ""),
                    data.get("status", "offline"),
                    data.get("avatarUrl", ""),
                    data.get("prompt", ""),
                    data.get("series", "通用"),
                    data.get("speaker"),
                    data.get("agentAppId"),
                    data.get("introScript"),
                    data.get("outroScript"),
                    data.get("ttsProvider", "edge"),
                    data.get("llmModel", "qwen-plus"),
                    now,
                    target_key,
                    target_key,
                ),
            )
        else:
            execute(
                """INSERT INTO dolls (
                   id, doll_id, name, station_code, tagline, role_title, status, avatar_url,
                   prompt, series, speaker, agent_app_id, intro_script, outro_script,
                   tts_provider, llm_model, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    record_id,
                    doll_id_val,
                    data.get("name", ""),
                    data.get("stationCode", ""),
                    data.get("tagline", ""),
                    data.get("roleTitle", ""),
                    data.get("status", "offline"),
                    data.get("avatarUrl", ""),
                    data.get("prompt", ""),
                    data.get("series", "通用"),
                    data.get("speaker"),
                    data.get("agentAppId"),
                    data.get("introScript"),
                    data.get("outroScript"),
                    data.get("ttsProvider", "edge"),
                    data.get("llmModel", "qwen-plus"),
                    now,
                    now,
                ),
            )

        channels = data.get("channels", [])
        if channels:
            for ch in channels:
                ch_id = ch.get("id") or f"var-{doll_id_val}-1"
                DollRepository.save_channel(doll_id_val, ch_id, ch)

        return {"status": "success", "id": record_id, "doll_id": doll_id_val}

    @staticmethod
    def delete_doll(target_key: str) -> dict[str, str]:
        existing = fetch_one("SELECT doll_id FROM dolls WHERE id = ? OR doll_id = ?", (target_key, target_key))
        if existing:
            doll_id_val = existing["doll_id"]
            execute("DELETE FROM channels WHERE doll_id = ?", (doll_id_val,))
        execute("DELETE FROM dolls WHERE id = ? OR doll_id = ?", (target_key, target_key))
        return {"status": "success"}

    @staticmethod
    def save_channel(doll_id: str, channel_id: str, data: dict[str, Any]) -> dict[str, Any]:
        now = utc_now()
        ch_id = data.get("id") or channel_id
        ch_key = data.get("channel_id") or channel_id

        existing = fetch_one(
            "SELECT id FROM channels WHERE (id = ? OR channel_id = ?) AND doll_id = ?",
            (channel_id, channel_id, doll_id),
        )
        if existing:
            execute(
                """UPDATE channels SET
                   channel_id = ?, name = ?, code = ?, category = ?, categories_json = ?,
                   prompt = ?, intro_script = ?, outro_script = ?, is_live = ?, playlist_json = ?,
                   tts_provider = ?, speaker = ?, llm_model = ?, updated_at = ?
                   WHERE (id = ? OR channel_id = ?) AND doll_id = ?""",
                (
                    ch_key,
                    data.get("name") or data.get("channel_name", ""),
                    data.get("code", ""),
                    data.get("category", "新闻频道"),
                    json.dumps(data.get("categories", []), ensure_ascii=False),
                    data.get("prompt", ""),
                    data.get("introScript") or data.get("intro_script", ""),
                    data.get("outroScript") or data.get("outro_script", ""),
                    1 if data.get("isLive") or data.get("is_live") else 0,
                    json.dumps(data.get("playlist", []), ensure_ascii=False),
                    data.get("ttsProvider") or data.get("tts_provider", "edge"),
                    data.get("speaker"),
                    data.get("llmModel") or data.get("llm_model", "qwen-plus"),
                    now,
                    channel_id,
                    channel_id,
                    doll_id,
                ),
            )
        else:
            execute(
                """INSERT INTO channels (
                   id, channel_id, doll_id, name, code, category, categories_json,
                   prompt, intro_script, outro_script, is_live, playlist_json,
                   tts_provider, speaker, llm_model, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    ch_id,
                    ch_key,
                    doll_id,
                    data.get("name") or data.get("channel_name", ""),
                    data.get("code", ""),
                    data.get("category", "新闻频道"),
                    json.dumps(data.get("categories", []), ensure_ascii=False),
                    data.get("prompt", ""),
                    data.get("introScript") or data.get("intro_script", ""),
                    data.get("outroScript") or data.get("outro_script", ""),
                    1 if data.get("isLive") or data.get("is_live") else 0,
                    json.dumps(data.get("playlist", []), ensure_ascii=False),
                    data.get("ttsProvider") or data.get("tts_provider", "edge"),
                    data.get("speaker"),
                    data.get("llmModel") or data.get("llm_model", "qwen-plus"),
                    now,
                    now,
                ),
            )
        return {"status": "success", "channel_id": ch_key}

    @staticmethod
    def delete_channel(doll_id: str, channel_id: str) -> dict[str, str]:
        execute(
            "DELETE FROM channels WHERE (id = ? OR channel_id = ?) AND doll_id = ?",
            (channel_id, channel_id, doll_id),
        )
        return {"status": "success", "deleted_channel_id": channel_id}

    @staticmethod
    def save_avatar(doll_id: str, image_base64: str) -> dict[str, Any]:
        base64_data = image_base64
        if "," in base64_data:
            base64_data = base64_data.split(",", 1)[1]

        try:
            img_bytes = base64.b64decode(base64_data)
        except Exception as e:
            raise ValueError(f"Invalid base64 image data: {e}")

        base_path = Path(__file__).resolve().parent.parent.parent.parent
        assets_dir = base_path / "assets" / "avatar" / "dolls"
        public_dir = base_path / "public" / "avatars"
        assets_dir.mkdir(parents=True, exist_ok=True)
        public_dir.mkdir(parents=True, exist_ok=True)

        filename = f"{doll_id}.png"
        (assets_dir / filename).write_bytes(img_bytes)
        (public_dir / filename).write_bytes(img_bytes)

        doll_name = DOLL_NAME_MAP.get(doll_id, "")
        if doll_name:
            clean_name = doll_name.replace(" ", "").replace("/", "_")
            desc_name = f"{doll_id}_{clean_name}.png"
            (assets_dir / desc_name).write_bytes(img_bytes)
            (public_dir / desc_name).write_bytes(img_bytes)

        timestamp = int(time.time())
        avatar_url = f"/avatars/{doll_id}.png?t={timestamp}"

        return {
            "status": "success",
            "doll_id": doll_id,
            "avatar_url": avatar_url,
            "assets_file": str(assets_dir / filename),
            "public_file": str(public_dir / filename),
        }
