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
        monkeypatch.setattr(settings, "allow_anonymous_device", False)
        init_database()
        yield {"audio_dir": temp_audio, "db": temp_db}


def test_auth_flow():
    app = create_app()
    client = TestClient(app)

    # 1. Unauthenticated request to admin endpoint should fail with 401
    resp = client.get("/api/v1/admin/news")
    assert resp.status_code == 401

    # 2. Login with incorrect credentials should fail
    resp_bad = client.post(
        "/api/v1/admin/auth/login",
        json={"username": "admin", "password": "wrongpassword"},
    )
    assert resp_bad.status_code == 401

    # 3. Login with correct default credentials should succeed
    resp_ok = client.post(
        "/api/v1/admin/auth/login",
        json={"username": "admin", "password": "admin123456"},
    )
    assert resp_ok.status_code == 200
    token = resp_ok.json()["token"]
    assert "admin_session" in client.cookies

    # 4. Authenticated request using cookie should succeed
    resp_authed = client.get("/api/v1/admin/news")
    assert resp_authed.status_code == 200
    assert "items" in resp_authed.json()

    # 5. Generative config should return masked API key
    cfg_resp = client.get("/api/v1/radio-ai/generative-config")
    assert cfg_resp.status_code == 200
    cfg_data = cfg_resp.json()
    assert "dashscope_api_key" in cfg_data
    assert not cfg_data["dashscope_api_key"].startswith("sk-real")


def test_path_traversal_prevention(setup_test_env):
    app = create_app()
    client = TestClient(app)

    # Login
    login_resp = client.post(
        "/api/v1/admin/auth/login",
        json={"username": "admin", "password": "admin123456"},
    )
    assert login_resp.status_code == 200

    # Attempt path traversal via local static path
    traversal_payload = {
        "channel_name": "测试频道",
        "playlist": [
            {
                "id": "node-hack",
                "title": "恶意路径节点",
                "audioUrl": "/static/audio/../../../../etc/passwd",
            }
        ],
    }

    freeze_resp = client.post(
        "/api/v1/radio-ai/dolls/MINI-LOTSO/channels/CH-LOTSO-01/freeze",
        json=traversal_payload,
    )
    assert freeze_resp.status_code == 200
    # Assert that /etc/passwd was not copied into channel folder
    channel_dir = setup_test_env["audio_dir"] / "channels" / "MINI-LOTSO" / "CH-LOTSO-01"
    for f in channel_dir.glob("node_node_hack.*"):
        assert "root:" not in f.read_text(errors="ignore")


def test_internal_secret_auth():
    app = create_app()
    client = TestClient(app)

    # Request without secret should be 403 Forbidden
    resp = client.put(
        "/api/v1/internal/news/news-123/script/status",
        json={"status": "generating"},
    )
    assert resp.status_code == 403

    # Request with invalid secret should be 403 Forbidden
    resp = client.put(
        "/api/v1/internal/news/news-123/script/status",
        json={"status": "generating"},
        headers={"X-Internal-Secret": "wrong-secret"},
    )
    assert resp.status_code == 403

    # Request with valid secret should succeed
    resp_ok = client.put(
        "/api/v1/internal/news/news-123/script/status",
        json={"status": "generating"},
        headers={"X-Internal-Secret": settings.internal_api_secret},
    )
    assert resp_ok.status_code == 200
