from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import os

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")


@dataclass(frozen=True)
class Settings:
    port: int = int(os.getenv("PORT", "8000"))
    database_path: Path = Path(os.getenv("RADIO_AI_DATABASE_PATH", BASE_DIR / "data" / "radio_ai.db"))
    audio_dir: Path = Path(os.getenv("RADIO_AI_AUDIO_DIR", BASE_DIR / "data" / "audio"))
    llm_provider: str = os.getenv("RADIO_AI_LLM_PROVIDER", "local").strip().lower()
    tts_provider: str = os.getenv("RADIO_AI_TTS_PROVIDER", "edge").strip().lower()
    dashscope_api_key: str = os.getenv("DASHSCOPE_API_KEY", os.getenv("BAILIAN_API_KEY", "")).strip()
    bailian_llm_model: str = os.getenv("BAILIAN_LLM_MODEL", "qwen-plus").strip()
    bailian_tts_model: str = os.getenv("BAILIAN_TTS_MODEL", "cosyvoice-v3-flash").strip()
    bailian_default_voice: str = os.getenv("BAILIAN_DEFAULT_VOICE", "longanya_v3").strip()
    default_voice: str = os.getenv("RADIO_AI_DEFAULT_VOICE", "zh-CN-XiaoxiaoNeural").strip()
    fetch_timeout_seconds: float = float(os.getenv("RADIO_AI_FETCH_TIMEOUT_SECONDS", "12"))


settings = Settings()
