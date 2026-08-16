import base64
import io
from pathlib import Path
import tempfile
from PIL import Image
import pytest

from radio_ai_data.config import settings
from radio_ai_data.db import init_database, execute, utc_now
from radio_ai_data.repositories import NewsRepository, DollRepository
from radio_ai_data.storage import safe_resolve_audio_path, scan_audio_assets


@pytest.fixture(autouse=True)
def setup_temp_db(monkeypatch):
    with tempfile.TemporaryDirectory() as tmpdir:
        temp_db_path = Path(tmpdir) / "test_radio.db"
        audio_dir = Path(tmpdir) / "audio"
        audio_dir.mkdir(parents=True, exist_ok=True)
        monkeypatch.setattr(settings, "database_path", temp_db_path)
        monkeypatch.setattr(settings, "audio_dir", audio_dir)
        init_database()
        yield audio_dir


def test_safe_resolve_audio_path(setup_temp_db):
    audio_dir = setup_temp_db
    valid_file = audio_dir / "test.mp3"
    valid_file.write_text("dummy")

    resolved = safe_resolve_audio_path("test.mp3")
    assert resolved == valid_file.resolve()

    with pytest.raises(ValueError):
        safe_resolve_audio_path("../../etc/passwd")

    with pytest.raises(ValueError):
        safe_resolve_audio_path("/etc/passwd")


def test_news_repository_crud():
    now = utc_now()
    execute(
        """INSERT INTO news (id, title, source, url, tag, script_text, script_status, audio_status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        ("news-001", "测试新闻", "自媒体", "https://example.com/test", "hot", "这是播报稿", "ready", "missing", now, now)
    )

    news = NewsRepository.require_news("news-001")
    assert news["title"] == "测试新闻"

    dto = NewsRepository.detail_dto(news)
    assert dto["id"] == "news-001"
    assert dto["script_text"] == "这是播报稿"

    with pytest.raises(KeyError):
        NewsRepository.require_news("non-existent-id")


def test_doll_avatar_validation():
    # 1. Invalid non-image data should fail
    with pytest.raises(ValueError):
        DollRepository.save_avatar("MINI-LOTSO", base64.b64encode(b"not an image").decode())

    # 2. Valid image should succeed
    img = Image.new("RGB", (32, 32), color="red")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    valid_b64 = base64.b64encode(buf.getvalue()).decode()

    res = DollRepository.save_avatar("MINI-LOTSO", valid_b64)
    assert res["status"] == "success"
    assert "avatar_url" in res
