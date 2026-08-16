from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import os

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")


@dataclass
class Settings:
    database_path: Path = Path(os.getenv("RADIO_AI_DATABASE_PATH", BASE_DIR / "data" / "radio_ai.db"))
    audio_dir: Path = Path(os.getenv("RADIO_AI_AUDIO_DIR", BASE_DIR / "data" / "audio"))
    fetch_timeout_seconds: float = float(os.getenv("RADIO_AI_FETCH_TIMEOUT_SECONDS", "12"))


settings = Settings()
