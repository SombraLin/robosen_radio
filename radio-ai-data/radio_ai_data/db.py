from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sqlite3
from typing import Any, Iterator
import bcrypt

from .config import settings


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def mask_api_key(key: str) -> str:
    if not key or len(key) < 8:
        return "" if not key else "****"
    return f"{key[:3]}...{key[-4:]}"


@contextmanager
def connection() -> Iterator[sqlite3.Connection]:
    settings.database_path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(settings.database_path, timeout=30)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA busy_timeout=5000")
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def migrate_database(db: sqlite3.Connection) -> None:
    news_cols = {row["name"] for row in db.execute("PRAGMA table_info(news)").fetchall()}
    if "custom_prompt" not in news_cols:
        db.execute("ALTER TABLE news ADD COLUMN custom_prompt TEXT")
    if "llm_model" not in news_cols:
        db.execute("ALTER TABLE news ADD COLUMN llm_model TEXT")
    if "tts_provider" not in news_cols:
        db.execute("ALTER TABLE news ADD COLUMN tts_provider TEXT")

    dolls_cols = {row["name"] for row in db.execute("PRAGMA table_info(dolls)").fetchall()}
    if "tts_provider" not in dolls_cols:
        db.execute("ALTER TABLE dolls ADD COLUMN tts_provider TEXT NOT NULL DEFAULT 'edge'")
    if "llm_model" not in dolls_cols:
        db.execute("ALTER TABLE dolls ADD COLUMN llm_model TEXT NOT NULL DEFAULT 'qwen-plus'")

    channels_cols = {row["name"] for row in db.execute("PRAGMA table_info(channels)").fetchall()}
    if "tts_provider" not in channels_cols:
        db.execute("ALTER TABLE channels ADD COLUMN tts_provider TEXT NOT NULL DEFAULT 'edge'")
    if "speaker" not in channels_cols:
        db.execute("ALTER TABLE channels ADD COLUMN speaker TEXT")
    if "llm_model" not in channels_cols:
        db.execute("ALTER TABLE channels ADD COLUMN llm_model TEXT NOT NULL DEFAULT 'qwen-plus'")

    gen_cols = {row["name"] for row in db.execute("PRAGMA table_info(generative_config)").fetchall()}
    if "dashscope_api_key" not in gen_cols:
        db.execute("ALTER TABLE generative_config ADD COLUMN dashscope_api_key TEXT NOT NULL DEFAULT ''")
    if "node_name" not in gen_cols:
        db.execute("ALTER TABLE generative_config ADD COLUMN node_name TEXT NOT NULL DEFAULT '每日要闻'")
    if "is_first" not in gen_cols:
        db.execute("ALTER TABLE generative_config ADD COLUMN is_first INTEGER NOT NULL DEFAULT 0")
    if "is_last" not in gen_cols:
        db.execute("ALTER TABLE generative_config ADD COLUMN is_last INTEGER NOT NULL DEFAULT 0")
    if "word_count" not in gen_cols:
        db.execute("ALTER TABLE generative_config ADD COLUMN word_count INTEGER NOT NULL DEFAULT 150")


def seed_default_dolls(db: sqlite3.Connection) -> None:
    now = utc_now()
    seeds_dir = Path(__file__).resolve().parent / "seeds" / "dolls"
    default_dolls: list[dict[str, Any]] = []

    if seeds_dir.exists():
        for json_file in sorted(seeds_dir.glob("*.json")):
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    default_dolls.append(json.load(f))
            except Exception:
                pass

    for d in default_dolls:
        db.execute(
            """INSERT OR REPLACE INTO dolls(id, doll_id, name, station_code, tagline, role_title, status, avatar_url, prompt, series, speaker, agent_app_id, intro_script, outro_script, tts_provider, llm_model, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                d["id"],
                d["doll_id"],
                d["name"],
                d.get("station_code", ""),
                d.get("tagline", ""),
                d.get("role_title", ""),
                d.get("status", "offline"),
                d.get("avatar_url", ""),
                d.get("prompt", ""),
                d.get("series", "通用"),
                d.get("speaker"),
                d.get("agent_app_id"),
                d.get("intro_script"),
                d.get("outro_script"),
                d.get("tts_provider", "edge"),
                d.get("llm_model", "qwen-plus"),
                now,
                now,
            ),
        )

        for ch in d.get("channels", []):
            db.execute(
                """INSERT OR REPLACE INTO channels(id, channel_id, doll_id, name, code, category, categories_json, prompt, intro_script, outro_script, is_live, playlist_json, tts_provider, speaker, llm_model, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    ch["id"],
                    ch["channel_id"],
                    d["doll_id"],
                    ch["name"],
                    ch.get("code", ""),
                    ch.get("category", "新闻频道"),
                    json.dumps(ch.get("categories", []), ensure_ascii=False),
                    ch.get("prompt", ""),
                    ch.get("intro_script", ""),
                    ch.get("outro_script", ""),
                    ch.get("is_live", 1),
                    json.dumps(ch.get("playlist", []), ensure_ascii=False),
                    ch.get("tts_provider", "edge"),
                    ch.get("speaker"),
                    ch.get("llm_model", "qwen-plus"),
                    now,
                    now,
                ),
            )


def seed_default_admin_and_devices(db: sqlite3.Connection) -> None:
    now = utc_now()
    default_admin_user = os.getenv("ADMIN_DEFAULT_USERNAME", "admin").strip()
    default_admin_pass = os.getenv("ADMIN_DEFAULT_PASSWORD", "admin123456").strip()

    # Check if admin user exists
    existing_admin = db.execute("SELECT id FROM admin_users WHERE username = ?", (default_admin_user,)).fetchone()
    if not existing_admin:
        pwd_hash = bcrypt.hashpw(default_admin_pass.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        db.execute(
            "INSERT INTO admin_users (id, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (f"admin-{default_admin_user}", default_admin_user, pwd_hash, now, now),
        )

    # Seed initial test devices
    default_devices = [
        ("TEST-DEVICE-01", "dev-token-secret-12345", "MINI-LOTSO"),
        ("DEV-SN-LOTSO-001", "token-lotso-pass-888", "MINI-LOTSO"),
        ("DEV-SN-ROBOT-001", "token-robot-pass-888", "MINI-ROBOT-A1"),
        ("DEV-SN-MARUKO-001", "token-maruko-pass-888", "XWZ-O-WLGZ"),
        ("DEV-SN-WOODY-001", "token-woody-pass-888", "MINI-WOODY"),
    ]
    for sn, token, doll_id in default_devices:
        token_hash = bcrypt.hashpw(token.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        db.execute(
            "INSERT OR IGNORE INTO devices (device_sn, token_hash, doll_id, status, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?)",
            (sn, token_hash, doll_id, now, now),
        )


def init_database() -> None:
    with connection() as db:
        db.execute("PRAGMA journal_mode=WAL")
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS admin_users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS devices (
                device_sn TEXT PRIMARY KEY,
                token_hash TEXT NOT NULL,
                doll_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS news (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                source TEXT NOT NULL,
                url TEXT NOT NULL UNIQUE,
                published_at TEXT,
                raw_summary TEXT NOT NULL DEFAULT '',
                clean_summary TEXT NOT NULL DEFAULT '',
                tag TEXT NOT NULL,
                language TEXT NOT NULL DEFAULT 'zh-CN',
                script_text TEXT NOT NULL DEFAULT '',
                script_status TEXT NOT NULL DEFAULT 'draft',
                audio_status TEXT NOT NULL DEFAULT 'missing',
                audio_path TEXT,
                audio_duration_seconds INTEGER,
                audio_size_bytes INTEGER,
                voice_id TEXT,
                custom_prompt TEXT,
                llm_model TEXT,
                tts_provider TEXT,
                failure_stage TEXT,
                failure_message TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                deleted_at TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_news_updated ON news(updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_news_tag ON news(tag);

            CREATE TABLE IF NOT EXISTS automation_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                enabled INTEGER NOT NULL DEFAULT 0,
                tags_json TEXT NOT NULL DEFAULT '{"hot": 3}',
                doll_id TEXT,
                interval_minutes INTEGER NOT NULL DEFAULT 60,
                version INTEGER NOT NULL DEFAULT 1,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS automation_runs (
                run_id TEXT PRIMARY KEY,
                trigger TEXT NOT NULL,
                status TEXT NOT NULL,
                started_at TEXT NOT NULL,
                finished_at TEXT,
                statistics_json TEXT NOT NULL DEFAULT '{}',
                failure_json TEXT
            );

            CREATE TABLE IF NOT EXISTS playback_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_sn TEXT NOT NULL,
                doll_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                current_item_id TEXT NOT NULL,
                progress_seconds INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'playing',
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_playback_created ON playback_logs(created_at DESC);

            CREATE TABLE IF NOT EXISTS audio_assets (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT '系统通用',
                channel_category TEXT NOT NULL DEFAULT '系统通用',
                audio_type TEXT NOT NULL DEFAULT '非TTS音效',
                duration TEXT NOT NULL DEFAULT '0:10',
                duration_seconds INTEGER NOT NULL DEFAULT 10,
                tags_json TEXT NOT NULL DEFAULT '[]',
                used_in_channels_json TEXT NOT NULL DEFAULT '[]',
                url TEXT,
                source_text TEXT,
                tts_provider TEXT,
                voice_id TEXT,
                speaker_or_source TEXT,
                synth_preset TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_audio_assets_updated ON audio_assets(updated_at DESC);

            CREATE TABLE IF NOT EXISTS dolls (
                id TEXT PRIMARY KEY,
                doll_id TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                station_code TEXT NOT NULL DEFAULT '',
                tagline TEXT NOT NULL DEFAULT '',
                role_title TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'offline',
                avatar_url TEXT NOT NULL DEFAULT '',
                prompt TEXT NOT NULL DEFAULT '',
                series TEXT NOT NULL DEFAULT '通用',
                speaker TEXT,
                agent_app_id TEXT,
                intro_script TEXT,
                outro_script TEXT,
                tts_provider TEXT NOT NULL DEFAULT 'edge',
                llm_model TEXT NOT NULL DEFAULT 'qwen-plus',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS channels (
                id TEXT PRIMARY KEY,
                channel_id TEXT NOT NULL UNIQUE,
                doll_id TEXT NOT NULL,
                name TEXT NOT NULL,
                code TEXT NOT NULL DEFAULT '',
                category TEXT,
                categories_json TEXT NOT NULL DEFAULT '[]',
                prompt TEXT NOT NULL DEFAULT '',
                intro_script TEXT NOT NULL DEFAULT '',
                outro_script TEXT NOT NULL DEFAULT '',
                is_live INTEGER NOT NULL DEFAULT 0,
                playlist_json TEXT NOT NULL DEFAULT '[]',
                tts_provider TEXT NOT NULL DEFAULT 'edge',
                speaker TEXT,
                llm_model TEXT NOT NULL DEFAULT 'qwen-plus',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_channels_doll ON channels(doll_id);

            CREATE TABLE IF NOT EXISTS generative_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                default_news_prompt TEXT NOT NULL DEFAULT '你是一名专业的新闻播报稿编辑。请把新闻素材改写成适合语音播报的中文短稿。要求：长度控制在80到150字；语言自然口语化；保留核心事实且不编造；不使用Markdown；只输出播报稿正文。',
                default_llm_provider TEXT NOT NULL DEFAULT 'bailian',
                default_llm_model TEXT NOT NULL DEFAULT 'qwen-plus',
                default_tts_provider TEXT NOT NULL DEFAULT 'edge',
                default_voice_id TEXT NOT NULL DEFAULT 'zh-CN-XiaoxiaoNeural',
                dashscope_api_key TEXT NOT NULL DEFAULT '',
                node_name TEXT NOT NULL DEFAULT '每日要闻',
                is_first INTEGER NOT NULL DEFAULT 0,
                is_last INTEGER NOT NULL DEFAULT 0,
                word_count INTEGER NOT NULL DEFAULT 150,
                updated_at TEXT NOT NULL
            );
            """
        )
        db.execute(
            "INSERT OR IGNORE INTO automation_config(id, updated_at) VALUES (1, ?)",
            (utc_now(),),
        )
        db.execute(
            "INSERT OR IGNORE INTO generative_config(id, updated_at) VALUES (1, ?)",
            (utc_now(),),
        )

        migrate_database(db)
        seed_default_admin_and_devices(db)

        count = db.execute("SELECT COUNT(*) FROM dolls").fetchone()[0]
        if count == 0:
            seed_default_dolls(db)


def fetch_one(sql: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
    with connection() as db:
        row = db.execute(sql, params).fetchone()
        return dict(row) if row else None


def fetch_all(sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    with connection() as db:
        return [dict(row) for row in db.execute(sql, params).fetchall()]


def execute(sql: str, params: tuple[Any, ...] = ()) -> int:
    with connection() as db:
        return db.execute(sql, params).rowcount


def automation_config() -> dict[str, Any]:
    row = fetch_one("SELECT * FROM automation_config WHERE id = 1") or {}
    tags = {tag: 0 for tag in ("hot", "entertainment", "auto", "sports", "tech", "china", "world", "military", "finance", "internet")}
    tags.update(json.loads(row.get("tags_json") or "{}"))
    return {
        "enabled": bool(row.get("enabled")),
        "tags": tags,
        "doll_id": row.get("doll_id"),
        "interval_minutes": row.get("interval_minutes", 60),
        "version": row.get("version", 1),
    }


def get_generative_config() -> dict[str, Any]:
    row = fetch_one("SELECT * FROM generative_config WHERE id = 1") or {}
    api_key_env = os.getenv("DASHSCOPE_API_KEY", os.getenv("BAILIAN_API_KEY", "")).strip()
    db_api_key = (row.get("dashscope_api_key") or "").strip()
    final_api_key = db_api_key or api_key_env or ""
    return {
        "default_news_prompt": row.get("default_news_prompt") or "你是一名专业的新闻播报稿编辑。请把新闻素材改写成适合语音播报的中文短稿。要求：长度控制在80到150字；语言自然口语化；保留核心事实且不编造；不使用Markdown；只输出播报稿正文。",
        "default_llm_provider": row.get("default_llm_provider") or "bailian",
        "default_llm_model": row.get("default_llm_model") or "qwen-plus",
        "default_tts_provider": row.get("default_tts_provider") or "edge",
        "default_voice_id": row.get("default_voice_id") or "zh-CN-XiaoxiaoNeural",
        "dashscope_api_key": final_api_key,
        "node_name": row.get("node_name", "每日要闻"),
        "is_first": bool(row.get("is_first")),
        "is_last": bool(row.get("is_last")),
        "word_count": row.get("word_count", 150),
        "updated_at": row.get("updated_at") or utc_now(),
    }


def get_generative_config_public() -> dict[str, Any]:
    config = get_generative_config()
    config["dashscope_api_key"] = mask_api_key(config.get("dashscope_api_key", ""))
    return config


def update_generative_config(data: dict[str, Any]) -> dict[str, Any]:
    now = utc_now()
    execute(
        """UPDATE generative_config SET
               default_news_prompt = COALESCE(?, default_news_prompt),
               default_llm_provider = COALESCE(?, default_llm_provider),
               default_llm_model = COALESCE(?, default_llm_model),
               default_tts_provider = COALESCE(?, default_tts_provider),
               default_voice_id = COALESCE(?, default_voice_id),
               dashscope_api_key = COALESCE(?, dashscope_api_key),
               node_name = COALESCE(?, node_name),
               is_first = COALESCE(?, is_first),
               is_last = COALESCE(?, is_last),
               word_count = COALESCE(?, word_count),
               updated_at = ?
           WHERE id = 1""",
        (
            data.get("default_news_prompt"),
            data.get("default_llm_provider"),
            data.get("default_llm_model"),
            data.get("default_tts_provider"),
            data.get("default_voice_id"),
            data.get("dashscope_api_key"),
            data.get("node_name"),
            int(data["is_first"]) if "is_first" in data else None,
            int(data["is_last"]) if "is_last" in data else None,
            data.get("word_count"),
            now,
        ),
    )
    if data.get("dashscope_api_key") is not None:
        os.environ["DASHSCOPE_API_KEY"] = data["dashscope_api_key"].strip()
    return get_generative_config()
