import os
from pathlib import Path
import tempfile
import pytest

from radio_ai_data.config import settings
from radio_ai_data.db import (
    init_database,
    connection,
    fetch_one,
    fetch_all,
    execute,
    mask_api_key,
    get_generative_config,
    get_generative_config_public,
    update_generative_config,
)
from radio_ai_data.repositories import AdminUserRepository, DeviceRepository, DollRepository


@pytest.fixture(autouse=True)
def setup_temp_db(monkeypatch):
    with tempfile.TemporaryDirectory() as tmpdir:
        temp_db_path = Path(tmpdir) / "test_radio.db"
        monkeypatch.setattr(settings, "database_path", temp_db_path)
        monkeypatch.setattr(settings, "audio_dir", Path(tmpdir) / "audio")
        init_database()
        yield


def test_mask_api_key():
    assert mask_api_key("") == ""
    assert mask_api_key("123") == "****"
    assert mask_api_key("sk-1234567890abcdef") == "sk-...cdef"


def test_db_init_and_config():
    cfg = get_generative_config()
    assert "default_news_prompt" in cfg
    
    update_generative_config({"dashscope_api_key": "sk-test-secret-key-12345"})
    
    internal_cfg = get_generative_config()
    assert internal_cfg["dashscope_api_key"] == "sk-test-secret-key-12345"
    
    public_cfg = get_generative_config_public()
    assert public_cfg["dashscope_api_key"] == "sk-...2345"


def test_admin_and_device_auth():
    admin = AdminUserRepository.get_by_username("admin")
    assert admin is not None
    assert AdminUserRepository.verify_password("admin123456", admin["password_hash"])
    assert not AdminUserRepository.verify_password("wrongpassword", admin["password_hash"])

    # Test device
    device = DeviceRepository.get_by_sn("TEST-DEVICE-01")
    assert device is not None
    assert DeviceRepository.verify_device_token("TEST-DEVICE-01", "dev-token-secret-12345")
    assert not DeviceRepository.verify_device_token("TEST-DEVICE-01", "wrongtoken")
