from pathlib import Path
import tempfile
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main_service.app_factory import create_app
from radio_ai_data.config import settings as data_settings
from radio_ai_data.db import init_database


@pytest.fixture(autouse=True)
def setup_test_env(monkeypatch):
    with tempfile.TemporaryDirectory() as tmpdir:
        temp_db = Path(tmpdir) / "test.db"
        temp_audio = Path(tmpdir) / "audio"
        temp_audio.mkdir(parents=True, exist_ok=True)
        monkeypatch.setattr(settings, "database_path", temp_db)
        monkeypatch.setattr(settings, "audio_dir", temp_audio)
        monkeypatch.setattr(data_settings, "database_path", temp_db)
        monkeypatch.setattr(data_settings, "audio_dir", temp_audio)
        init_database()
        yield


def test_shared_spec_doll_contract():
    """Verify backend Doll DTO contract against @radio-ai/shared-spec Doll interface definition."""
    app = create_app()
    client = TestClient(app)

    # Login
    client.post("/api/v1/admin/auth/login", json={"username": "admin", "password": "admin123456"})

    resp = client.get("/api/v1/radio-ai/dolls")
    assert resp.status_code == 200
    dolls = resp.json()
    assert len(dolls) > 0

    first_doll = dolls[0]
    doll_keys = set(first_doll.keys())

    # Keys required by @radio-ai/shared-spec Doll type:
    expected_doll_keys = {
        "id",
        "doll_id",
        "name",
        "stationCode",
        "tagline",
        "roleTitle",
        "status",
        "avatarUrl",
        "prompt",
        "series",
        "speaker",
        "channels",
        "ttsProvider",
        "llmModel",
    }

    missing_keys = expected_doll_keys - doll_keys
    assert not missing_keys, f"Backend Doll API is missing contract fields: {missing_keys}"



def test_shared_spec_generative_config_contract():
    """Verify backend GenerativeConfig contract against @radio-ai/shared-spec."""
    app = create_app()
    client = TestClient(app)

    client.post("/api/v1/admin/auth/login", json={"username": "admin", "password": "admin123456"})
    resp = client.get("/api/v1/radio-ai/generative-config")
    assert resp.status_code == 200
    cfg = resp.json()

    expected_keys = {
        "default_news_prompt",
        "default_llm_provider",
        "default_llm_model",
        "default_tts_provider",
        "default_voice_id",
        "dashscope_api_key",
        "node_name",
        "word_count",
    }

    cfg_keys = set(cfg.keys())
    missing = expected_keys - cfg_keys
    assert not missing, f"Backend GenerativeConfig API is missing contract fields: {missing}"
