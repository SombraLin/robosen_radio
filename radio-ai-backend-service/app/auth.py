from __future__ import annotations

import hmac
import logging
from typing import Any
from fastapi import HTTPException, Request, Depends, status
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from app.config import settings
from radio_ai_data.repositories import AdminUserRepository, DeviceRepository

logger = logging.getLogger(__name__)

_serializer = URLSafeTimedSerializer(settings.admin_session_secret, salt="admin-session-salt")


def create_admin_session(username: str) -> str:
    return _serializer.dumps({"sub": username})


def verify_admin_session(token: str) -> str | None:
    try:
        data = _serializer.loads(token, max_age=settings.admin_session_lifetime_seconds)
        return data.get("sub")
    except (BadSignature, SignatureExpired):
        return None


async def require_admin_session(request: Request) -> dict[str, Any]:
    # 1. Check session cookie
    token = request.cookies.get("admin_session")
    
    # 2. Or check Authorization Bearer header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未授权访问，请先登录管理员账号",
        )

    username = verify_admin_session(token)
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="登录状态已过期或无效，请重新登录",
        )

    user = AdminUserRepository.get_by_username(username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在或已被停用",
        )

    return {"username": user["username"], "id": user["id"]}


async def require_device_token(request: Request) -> str | None:
    device_token = request.headers.get("X-Device-Token")
    device_sn = request.headers.get("X-Device-SN")

    # If anonymous access is explicitly allowed for local debugging
    if not device_token and settings.allow_anonymous_device:
        return "anonymous-device"

    if not device_token or not device_sn:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="缺少设备身份凭据 (X-Device-SN 或 X-Device-Token)",
        )

    if not DeviceRepository.verify_device_token(device_sn, device_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="设备鉴权失败，无效的设备 Token 或设备未激活",
        )

    return device_sn


async def require_internal_secret(request: Request) -> None:
    incoming_secret = request.headers.get("X-Internal-Secret", "")
    if not incoming_secret:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="缺少内部调用密钥 X-Internal-Secret",
        )

    if not hmac.compare_digest(incoming_secret, settings.internal_api_secret):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="内部调用密钥校验失败",
        )
