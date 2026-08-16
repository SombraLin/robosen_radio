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
        yield


def test_device_token_auth():
    app = create_app()
    client = TestClient(app)

    # 1. Unauthenticated device request should return 401
    resp = client.get("/api/v1/device/dolls/MINI-LOTSO/channels")
    assert resp.status_code == 401

    # 2. Invalid device token should return 401
    resp_bad = client.get(
        "/api/v1/device/dolls/MINI-LOTSO/channels",
        headers={"X-Device-SN": "TEST-DEVICE-01", "X-Device-Token": "bad-token"},
    )
    assert resp_bad.status_code == 401

    # 3. Valid device token should succeed
    resp_ok = client.get(
        "/api/v1/device/dolls/MINI-LOTSO/channels",
        headers={"X-Device-SN": "TEST-DEVICE-01", "X-Device-Token": "dev-token-secret-12345"},
    )
    assert resp_ok.status_code == 200
    data = resp_ok.json()
    assert data["doll_id"] == "MINI-LOTSO"
    assert "channels" in data


def test_device_websocket_theater_auth():
    app = create_app()
    client = TestClient(app)

    # WebSocket connection with invalid token
    with client.websocket_connect("/ws/v1/device/theater/channel-session") as websocket:
        websocket.send_json({
            "event": "JOIN_ROOM",
            "room_id": "room-1",
            "doll_id": "MINI-LOTSO",
            "device_sn": "TEST-DEVICE-01",
            "token": "wrong-token",
        })
        resp = websocket.receive_json()
        assert resp.get("event") == "AUTH_FAILED"

    # WebSocket connection with valid token
    with client.websocket_connect("/ws/v1/device/theater/channel-session") as websocket:
        websocket.send_json({
            "event": "JOIN_ROOM",
            "room_id": "room-1",
            "doll_id": "MINI-LOTSO",
            "device_sn": "TEST-DEVICE-01",
            "token": "dev-token-secret-12345",
        })
        resp = websocket.receive_json()
        assert resp.get("event") == "ROOM_READY"
        assert "MINI-LOTSO" in resp.get("speakers", [])
