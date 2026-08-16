from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
import json
import os
import sqlite3
from threading import RLock
from typing import Any, Iterator

from .config import settings


_LOCK = RLock()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def connection() -> Iterator[sqlite3.Connection]:
    settings.database_path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(settings.database_path, timeout=30)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
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
    default_dolls = [
        {
            "id": "doll-lotso",
            "doll_id": "MINI-LOTSO",
            "name": "草莓熊 Lotso",
            "station_code": "STATION_LOTSO",
            "tagline": "草莓香味玩具总动员专栏主播",
            "role_title": "治愈系主播",
            "status": "online",
            "avatar_url": "/avatars/MINI-LOTSO.png",
            "prompt": "带着浓郁草莓香味的软萌玩偶，用温暖憨厚的语调聊聊生活中的童真与美好。",
            "series": "迪士尼IP",
            "speaker": "cosyvoice-v3.5-plus-lotso-49ffdf5a5c024a6499a4e7e904ed3cc5",
            "agent_app_id": "mm_a2b2711e18cc4c77a73b83369675",
            "intro_script": "你好呀！我是草莓熊，闻到草莓香气了吗？欢迎收听今日特刊。",
            "outro_script": "今天也要像草莓一样甜甜的哦，我们下次见！",
            "channels": [
                {
                    "id": "var-lotso-1",
                    "channel_id": "CH-LOTSO-01",
                    "name": "草莓熊治愈特刊频道",
                    "code": "CH-LOTSO-01",
                    "category": "新闻频道",
                    "categories": ["玩具特刊", "童趣感语"],
                    "prompt": "带着浓郁草莓香味的软萌玩偶，用温暖憨厚的语调聊聊生活中的童真与美好。",
                    "intro_script": "你好呀！我是草莓熊，闻到草莓香气了吗？欢迎收听今日特刊。",
                    "outro_script": "今天也要像草莓一样甜甜的哦，我们下次见！",
                    "is_live": 1,
                    "playlist": [
                        {
                            "id": "lotso-p1",
                            "type": "intro",
                            "title": "【草莓熊广播站】今日热点新闻片头 Jingle",
                            "speakerRole": "草莓熊 (主播)",
                            "durationSeconds": 12,
                            "durationFormatted": "0:12",
                            "contentSnippet": "草莓香味广播站，陪伴你的每一刻~",
                        },
                        {
                            "id": "lotso-p2",
                            "type": "transition",
                            "title": "草莓软糖卡顿转场音",
                            "speakerRole": "系统音效",
                            "durationSeconds": 5,
                            "durationFormatted": "0:05",
                            "contentSnippet": "[啾啾啾~ 草莓软糖碰撞声]",
                        },
                        {
                            "id": "lotso-p3",
                            "type": "news_script",
                            "title": "科技快讯：全球 AI 虚拟玩偶交互技术迎来里程碑",
                            "speakerRole": "男主持人",
                            "durationSeconds": 45,
                            "durationFormatted": "0:45",
                            "contentSnippet": "今日，新型智能玩偶算法成功实现了声音与情感的高度拟真...",
                        },
                        {
                            "id": "lotso-p4",
                            "type": "news_script",
                            "title": "文化焦点：童趣 IP 结合智能硬件引领消费新浪潮",
                            "speakerRole": "女主持人",
                            "durationSeconds": 50,
                            "durationFormatted": "0:50",
                            "contentSnippet": "越来越多消费者选择具备语音陪伴功能的实体玩偶作为办公桌治愈伙伴...",
                        },
                        {
                            "id": "lotso-p5",
                            "type": "commentary",
                            "title": "草莓熊独家点评：科技不仅要有速度，更要有温度和草莓香味！",
                            "speakerRole": "草莓熊 (主播)",
                            "durationSeconds": 30,
                            "durationFormatted": "0:30",
                            "contentSnippet": "哼哼，我觉得嘛，不管算法多厉害，最重要的还是抱起来软软的！",
                        },
                        {
                            "id": "lotso-p6",
                            "type": "outro",
                            "title": "【草莓熊广播站】谢幕曲与晚安提示",
                            "speakerRole": "草莓熊 (主播)",
                            "durationSeconds": 15,
                            "durationFormatted": "0:15",
                            "contentSnippet": "好啦，今天的新闻特刊就到这里，祝你今晚做个甜甜的草莓梦！",
                        },
                    ],
                }
            ],
        },
        {
            "id": "doll-robot-a1",
            "doll_id": "MINI-ROBOT-A1",
            "name": "野原新之助 (康达姆 A1)",
            "station_code": "STATION_ROBOT_A1",
            "tagline": "双叶幼儿园特命主播 / 幽默爆笑特刊",
            "role_title": "搞笑特派员",
            "status": "online",
            "avatar_url": "/avatars/MINI-ROBOT-A1.png",
            "prompt": "充满童趣与无厘头的搞笑播报风格，充满大象舞与康达姆机器人的幽默活力。",
            "series": "日系IP",
            "speaker": "cosyvoice-v3.5-plus-xiaoxin-38bc6f91ce58475bbc8c9a5d534b3a64",
            "agent_app_id": "mm_d1684ee2f57d4a44a8c23bef905c",
            "intro_script": "你好！我是野原新之助，今天为你带来超酷的康达姆机器人 A1 特报！",
            "outro_script": "动感超人，beam！今天的新闻就到这里啦！",
            "channels": [
                {
                    "id": "var-robot-a1",
                    "channel_id": "CH-ROBOT-A1",
                    "name": "新之助 - 康达姆机器人 A1 频道",
                    "code": "CH-ROBOT-A1",
                    "category": "新闻频道",
                    "categories": ["动漫爆笑", "儿童特快"],
                    "prompt": "充满童趣与无厘头的搞笑播报风格，充满大象舞与康达姆机器人的幽默活力。",
                    "intro_script": "你好！我是野原新之助，今天为你带来超酷的康达姆机器人 A1 特报！",
                    "outro_script": "动感超人，beam！今天的新闻就到这里啦！",
                    "is_live": 1,
                    "playlist": [
                        {
                            "id": "shin-p1",
                            "type": "intro",
                            "title": "【动感开场】动感超人 Beam 警报音效",
                            "speakerRole": "野原新之助",
                            "durationSeconds": 10,
                            "durationFormatted": "0:10",
                            "contentSnippet": "哇哈哈哈哈！动感新之助频道开播啦！",
                        },
                        {
                            "id": "shin-p2",
                            "type": "news_script",
                            "title": "爆笑新闻：春日部防卫队发现巨型巧克力饼干遗迹",
                            "speakerRole": "野原新之助",
                            "durationSeconds": 40,
                            "durationFormatted": "0:40",
                            "contentSnippet": "大消息大消息！美冴今天买的巧克力饼干被我找到啦！",
                        },
                        {
                            "id": "shin-p3",
                            "type": "outro",
                            "title": "【动感谢幕】小白回家广播",
                            "speakerRole": "野原新之助",
                            "durationSeconds": 10,
                            "durationFormatted": "0:10",
                            "contentSnippet": "小白，散步时间到了，走咯！",
                        },
                    ],
                }
            ],
        },
        {
            "id": "doll-maruko-wlgz",
            "doll_id": "XWZ-O-WLGZ",
            "name": "樱桃小丸子 (丸皮公主)",
            "station_code": "STATION_MARUKO_01",
            "tagline": "清水市生活特刊 / 治愈系少女主播",
            "role_title": "生活感悟主播",
            "status": "online",
            "avatar_url": "/avatars/XWZ-O-WLGZ.png",
            "prompt": "带着小丸子招牌的真诚、稍微带点小懒惰但极其治愈的娓娓道来风。",
            "series": "日系IP",
            "speaker": "cosyvoice-v3.5-plus-wanzi-2de095b4499040f6b00397ff53f58afe",
            "agent_app_id": "mm_9b440d039dd849ff874efc665770",
            "intro_script": "只要活着就会有好事发生的！大家好，我是小丸子，欢迎听我碎碎念。",
            "outro_script": "爷爷说得对，今天也是值得吃一顿好的好日子呢。",
            "channels": [
                {
                    "id": "var-maruko-1",
                    "channel_id": "CH-MARUKO-WLGZ",
                    "name": "小丸子清水市碎碎念频道",
                    "code": "CH-MARUKO-WLGZ",
                    "category": "故事频道",
                    "categories": ["日常生活", "童话回忆"],
                    "prompt": "带着小丸子招牌的真诚、稍微带点小懒惰但极其治愈的娓娓道来风。",
                    "intro_script": "只要活着就会有好事发生的！大家好，我是小丸子，欢迎听我碎碎念。",
                    "outro_script": "爷爷说得对，今天也是值得吃一顿好的好日子呢。",
                    "is_live": 1,
                    "playlist": [
                        {
                            "id": "mk-p1",
                            "type": "intro",
                            "title": "【清水市广播】小丸子吉他弹唱片头",
                            "speakerRole": "樱桃小丸子",
                            "durationSeconds": 15,
                            "durationFormatted": "0:15",
                            "contentSnippet": "只要活着就会有好事发生的哦~",
                        },
                        {
                            "id": "mk-p2",
                            "type": "story_body",
                            "title": "小丸子故事：今天在学校和花轮同学聊到的刨冰奇遇",
                            "speakerRole": "樱桃小丸子",
                            "durationSeconds": 60,
                            "durationFormatted": "1:00",
                            "contentSnippet": "Hey baby... 花轮同学今天请大家吃了三种颜色的刨冰呢！",
                        },
                        {
                            "id": "mk-p3",
                            "type": "outro",
                            "title": "【清水市广播】爷爷的安抚谢幕语",
                            "speakerRole": "樱桃小丸子",
                            "durationSeconds": 12,
                            "durationFormatted": "0:12",
                            "contentSnippet": "今天也辛苦了，明天继续加油吧！",
                        },
                    ],
                }
            ],
        },
        {
            "id": "doll-woody",
            "doll_id": "MINI-WOODY",
            "name": "胡迪 Woody",
            "station_code": "STATION_WOODY",
            "tagline": "西部警长 / 忠诚义气主持人",
            "role_title": "正义导播",
            "status": "online",
            "avatar_url": "/avatars/MINI-WOODY.png",
            "prompt": "沉稳正义、充满义气与领导力的警长声音，靴子里有只靴蛇的经典幽默。",
            "series": "迪士尼IP",
            "speaker": "cosyvoice-v3.5-plus-hudi-a528aa91d91e4beab1ef260045ed923e",
            "agent_app_id": "mm_7bbe89a25aef4ad99c28f31d7eb4",
            "intro_script": "我的靴子里有只靴蛇！我是胡迪警长，欢迎收听西部特报。",
            "outro_script": "伙伴们，保持警惕，我们是一家人！",
            "channels": [
                {
                    "id": "var-woody-1",
                    "channel_id": "CH-WOODY-01",
                    "name": "胡迪警长西部正义频道",
                    "code": "CH-WOODY-01",
                    "category": "新闻频道",
                    "categories": ["西部特快", "玩具正义联盟"],
                    "prompt": "沉稳正义、充满义气与领导力的警长声音，靴子里有只靴蛇的经典幽默。",
                    "intro_script": "我的靴子里有只靴蛇！我是胡迪警长，欢迎收听西部特报。",
                    "outro_script": "伙伴们，保持警惕，我们是一家人！",
                    "is_live": 1,
                    "playlist": [
                        {
                            "id": "wd-p1",
                            "type": "intro",
                            "title": "【西部号角】胡迪警长开场口哨",
                            "speakerRole": "胡迪警长",
                            "durationSeconds": 10,
                            "durationFormatted": "0:10",
                            "contentSnippet": "我的靴子里有只靴蛇！西部警长广播站开播！",
                        },
                        {
                            "id": "wd-p2",
                            "type": "news_script",
                            "title": "正义特报：玩具总动员联盟完成年度巡逻任务",
                            "speakerRole": "胡迪警长",
                            "durationSeconds": 50,
                            "durationFormatted": "0:50",
                            "contentSnippet": "报告大家，安迪的房间目前一切安全！",
                        },
                        {
                            "id": "wd-p3",
                            "type": "outro",
                            "title": "【西部号角】牛仔友情谢幕曲",
                            "speakerRole": "胡迪警长",
                            "durationSeconds": 15,
                            "durationFormatted": "0:15",
                            "contentSnippet": "记住，无论遇到什么困难，你都有我这个朋友！",
                        },
                    ],
                }
            ],
        },
    ]

    for d in default_dolls:
        db.execute(
            """INSERT OR REPLACE INTO dolls(id, doll_id, name, station_code, tagline, role_title, status, avatar_url, prompt, series, speaker, agent_app_id, intro_script, outro_script, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                d["id"],
                d["doll_id"],
                d["name"],
                d["station_code"],
                d["tagline"],
                d["role_title"],
                d["status"],
                d["avatar_url"],
                d["prompt"],
                d["series"],
                d.get("speaker"),
                d.get("agent_app_id"),
                d.get("intro_script"),
                d.get("outro_script"),
                now,
                now,
            ),
        )

        for ch in d.get("channels", []):
            db.execute(
                """INSERT OR REPLACE INTO channels(id, channel_id, doll_id, name, code, category, categories_json, prompt, intro_script, outro_script, is_live, playlist_json, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    ch["id"],
                    ch["channel_id"],
                    d["doll_id"],
                    ch["name"],
                    ch["code"],
                    ch["category"],
                    json.dumps(ch.get("categories", []), ensure_ascii=False),
                    ch["prompt"],
                    ch.get("intro_script", ""),
                    ch.get("outro_script", ""),
                    ch.get("is_live", 1),
                    json.dumps(ch.get("playlist", []), ensure_ascii=False),
                    now,
                    now,
                ),
            )


def init_database() -> None:
    with _LOCK, connection() as db:
        db.executescript(
            """
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

        count = db.execute("SELECT COUNT(*) FROM dolls").fetchone()[0]
        if count == 0:
            seed_default_dolls(db)


def fetch_one(sql: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
    with _LOCK, connection() as db:
        row = db.execute(sql, params).fetchone()
        return dict(row) if row else None


def fetch_all(sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    with _LOCK, connection() as db:
        return [dict(row) for row in db.execute(sql, params).fetchall()]


def execute(sql: str, params: tuple[Any, ...] = ()) -> int:
    with _LOCK, connection() as db:
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
