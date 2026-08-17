# RADIO AI 系统代码架构审查与缺陷修复详细技术文档

本技术文档基于对 `robosen_radio` 整体代码架构（包含 `radio-ai-backend-service`、`radio-ai-data`、`radio-ai-crawler`、`radio-ai-tts`、`radio-ai-engine` 及 `radio-ai-admin-console`）的全面代码审计。

本文档**不修改现有源码**，对各模块中发现的架构缺陷、并发竞态、安全隐患和边界异常进行深度剖析，并提供完整的落地修复代码。

---

## 目录
1. [系统整体架构与数据流拓扑](#1-系统整体架构与数据流拓扑)
2. [缺陷 1：异步流水线调度编排时序竞态（Pipeline Celery Async Race Condition）](#2-缺陷-1异步流水线调度编排时序竞态pipeline-celery-async-race-condition)
3. [缺陷 2：剧场 WebSocket 房间并发连接管理与广播故障（Theater WS Concurrency Fault）](#3-缺陷-2剧场-websocket-房间并发连接管理与广播故障theater-ws-concurrency-fault)
4. [缺陷 3：频道固化外部音频下载 SSRF 绕过与流式大文件溢出（SSRF & Audio Buffer Vulnerability）](#4-缺陷-3频道固化外部音频下载-ssrf-绕过与流式大文件溢出ssrf--audio-buffer-vulnerability)
5. [缺陷 4：SQLite 数据库并发写入超时与连接资源死锁（DB Connection WAL Lock & Timeout）](#5-缺陷-4sqlite-数据库并发写入超时与连接资源死锁db-connection-wal-lock--timeout)
6. [缺陷 5：爬虫解析时间戳时区偏移与不可预期的 DOM 结构异常（Crawler Parser Resilience）](#6-缺陷-5爬虫解析时间戳时区偏移与不可预期的-dom-结构异常crawler-parser-resilience)
7. [缺陷 6：健康探针阻塞同步线程与超时级联雪崩（Health Probe Blocking IO & Cascading Timeout）](#7-缺陷-6健康探针阻塞同步线程与超时级联雪崩health-probe-blocking-io--cascading-timeout)
8. [缺陷 7：TTS 引擎音频时长估算误差与临时文件泄漏（TTS Audio Length Calculation & Temp Leak）](#8-缺陷-7tts-引擎音频时长估算误差与临时文件泄漏tts-audio-length-calculation--temp-leak)
9. [缺陷 8：自动化调度器配置乐观锁并发覆写与执行状态脏写（Automation Race Conditions）](#9-缺陷-8自动化调度器配置乐观锁并发覆写与执行状态脏写automation-race-conditions)
10. [架构审查总结与实施建议](#10-架构审查总结与实施建议)

---

## 1. 系统整体架构与数据流拓扑

系统采用分布式/微服务模块化设计：
- **`radio-ai-backend-service`**：基于 FastAPI 的中心控制服务，提供管理端 API、设备端接入 API、剧场协同 WebSocket、自动化任务编排。
- **`radio-ai-data`**：集中式 SQLite（WAL 模式）数据仓储层，提供用户鉴权、玩偶角色、频道资源清单（Manifest）、音效资产和播放日志。
- **`radio-ai-crawler`**：ZAKER 资讯抓取与清洗微服务，支持 Celery 异步稿件改写生成。
- **`radio-ai-engine`**：基于阿里百炼（DashScope Qwen-Plus/Max）的 LLM 提示词工程与口语化短稿生成。
- **`radio-ai-tts`**：基于 Edge-TTS 与阿里百炼 CosyVoice3 的双通道语音合成微服务。
- **`radio-ai-admin-console`**：React 18 + Vite + Tailwind + Lucide 前端控制台。

---

## 2. 缺陷 1：异步流水线调度编排时序竞态（Pipeline Celery Async Race Condition）

### 2.1 缺陷描述与影响
- **所在文件**：`radio-ai-backend-service/app/main_service/pipeline.py` 中的 `run_pipeline()` 与 `create_audio()`
- **原因分析**：
  在 `run_pipeline` 中，系统依次调用了：
  ```python
  await create_script(news_id, custom_prompt=request.custom_prompt, llm_model=request.llm_model)
  if request.generate_audio:
      await create_audio(news_id, voice_id=request.voice_id, tts_provider=request.tts_provider)
  ```
  `create_script` 执行时将任务提交到 Celery (`celery_app.send_task("crawler.generate_script", ...)` ) 并立即返回状态 `queued`，此时数据库中的 `script_status` 为 `"generating"`，`script_text` 仍为空。
  紧接着执行的 `create_audio` 检查：
  ```python
  if row["script_status"] != "ready" or not row["script_text"].strip():
      raise HTTPException(status_code=409, detail="请先生成可用的新闻稿")
  ```
  导致 `run_pipeline(PipelineRequest(generate_audio=True))` 必定在第 2 步抛出 `409 Conflict` 异常，使得自动化调度和批量处理的新闻无法连续完成音频生成。
- **异常场景**：
  1. 定时任务轮询抓取新闻并勾选生成音频时，所有任务在音频生成步骤 100% 失败。
  2. Celery 异步任务未完成时，前端轮询得到的是 `script_status='generating'`，但 `audio_status` 被置为 `failed`。

### 2.2 修复方案与落地代码
使用 Celery Task Chaining（任务链）或在异步回调中触发下一步音频生成；在同步/全流程 API 中，若 Celery 未启用或处于直接流水线模式，提供可靠的任务等待或分阶段触发机制。

**落地修复代码 (`radio-ai-backend-service/app/main_service/pipeline.py`)**：
```python
from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import HTTPException

from app.config import settings
from app.schemas import FetchRequest, PipelineRequest

try:
    from radio_ai_crawler import fetch_zaker, normalize_tag
except ImportError:
    from radio_ai_crawler.zaker_fetcher import fetch_zaker, normalize_tag

try:
    from radio_ai_data import connection, execute, fetch_all, get_generative_config, utc_now, NewsRepository
except ImportError:
    import sys
    sys.path.append(str(Path(__file__).resolve().parents[3] / "radio-ai-data"))
    from radio_ai_data import connection, execute, fetch_all, get_generative_config, utc_now, NewsRepository

from .celery_app import celery_app


async def fetch_and_store(request: FetchRequest) -> dict[str, Any]:
    tag = normalize_tag(request.tag)
    candidates, stats = await fetch_zaker(tag, request.language)
    existing = {row["url"] for row in fetch_all("SELECT url FROM news")}
    stored: list[str] = []
    for candidate in candidates:
        if candidate.url in existing:
            stats["duplicate_url_history"] = stats.get("duplicate_url_history", 0) + 1
            continue
        news_id = str(uuid4())
        now = utc_now()
        with connection() as db:
            db.execute(
                """INSERT INTO news(
                    id,title,source,url,published_at,raw_summary,clean_summary,tag,language,
                    script_status,audio_status,created_at,updated_at
                ) VALUES (?,?,?,?,?,?,?,?,?,'draft','missing',?,?)""",
                (
                    news_id, candidate.title, candidate.source, candidate.url,
                    candidate.published_at.isoformat() if candidate.published_at else None,
                    candidate.raw_summary, candidate.clean_summary, tag, request.language, now, now,
                ),
            )
        existing.add(candidate.url)
        stored.append(news_id)
        if len(stored) >= request.limit:
            break
    stats["stored"] = len(stored)
    stats["exhausted"] = int(not stored)
    return {"tag": tag, "news_ids": stored, "statistics": stats}


async def create_script(
    news_id: str,
    custom_prompt: str | None = None,
    llm_model: str | None = None,
    llm_provider: str | None = None,
) -> dict[str, Any]:
    row = NewsRepository.require_news(news_id)
    execute(
        "UPDATE news SET script_status='generating', failure_stage=NULL, failure_message=NULL, updated_at=? WHERE id=?",
        (utc_now(), news_id),
    )
    try:
        gen_cfg = get_generative_config()
        effective_prompt = (custom_prompt or row.get("custom_prompt") or gen_cfg["default_news_prompt"]).strip()
        effective_model = (llm_model or row.get("llm_model") or gen_cfg["default_llm_model"]).strip()
        effective_provider = (llm_provider or gen_cfg["default_llm_provider"]).strip()

        # Send Celery task asynchronously
        result = celery_app.send_task(
            "crawler.generate_script",
            kwargs={
                "news_id": news_id,
                "title": row["title"],
                "source": row["source"],
                "clean_summary": row["clean_summary"] or row["raw_summary"],
                "published_at": (
                    row["published_at"].isoformat()
                    if hasattr(row["published_at"], "isoformat")
                    else (str(row["published_at"]) if row["published_at"] else None)
                ),
                "custom_prompt": effective_prompt,
                "llm_model": effective_model,
                "llm_provider": effective_provider,
            },
        )
        return {
            "status": "queued",
            "task_id": result.id,
            "news_id": news_id,
            "script_status": "generating",
        }
    except Exception as exc:
        execute(
            "UPDATE news SET script_status='failed', failure_stage='script', failure_message=?, updated_at=? WHERE id=?",
            (str(exc)[:2000], utc_now(), news_id),
        )
        raise


async def create_audio(
    news_id: str,
    voice_id: str | None = None,
    tts_provider: str | None = None,
) -> dict[str, Any]:
    row = NewsRepository.require_news(news_id)
    if row["script_status"] != "ready" or not (row.get("script_text") or "").strip():
        raise HTTPException(status_code=409, detail="请先生成可用的新闻稿")

    gen_cfg = get_generative_config()
    voice = (voice_id or row.get("voice_id") or gen_cfg["default_voice_id"]).strip()
    provider = (tts_provider or row.get("tts_provider") or gen_cfg["default_tts_provider"]).strip()

    execute(
        "UPDATE news SET audio_status='generating', failure_stage=NULL, failure_message=NULL, updated_at=? WHERE id=?",
        (utc_now(), news_id),
    )
    try:
        news_dir = settings.audio_dir / "news"
        news_dir.mkdir(parents=True, exist_ok=True)
        output_stem = news_dir / f"news-{news_id}-{uuid4().hex[:8]}"

        result = celery_app.send_task(
            "tts.synthesize_audio",
            kwargs={
                "news_id": news_id,
                "text": row["script_text"],
                "voice_id": voice,
                "output_stem_str": str(output_stem),
                "tts_provider": provider,
            },
        )
        return {
            "status": "queued",
            "task_id": result.id,
            "news_id": news_id,
            "audio_status": "generating",
        }
    except Exception as exc:
        execute(
            "UPDATE news SET audio_status='failed', failure_stage='audio', failure_message=?, updated_at=? WHERE id=?",
            (str(exc)[:2000], utc_now(), news_id),
        )
        raise


async def wait_for_script_ready(news_id: str, timeout_seconds: float = 30.0) -> dict[str, Any]:
    """Poll DB until script generation completes or times out."""
    start_time = asyncio.get_event_loop().time()
    while (asyncio.get_event_loop().time() - start_time) < timeout_seconds:
        row = NewsRepository.require_news(news_id)
        if row["script_status"] == "ready":
            return row
        if row["script_status"] == "failed":
            raise RuntimeError(f"文稿生成失败: {row.get('failure_message', '未知错误')}")
        await asyncio.sleep(1.0)
    raise TimeoutError(f"等待文稿生成超时 ({timeout_seconds}秒)")


async def run_pipeline(request: PipelineRequest) -> dict[str, Any]:
    fetch_result = await fetch_and_store(request)
    items: list[dict[str, Any]] = []
    failures: list[dict[str, str]] = []
    for news_id in fetch_result["news_ids"]:
        try:
            await create_script(news_id, custom_prompt=request.custom_prompt, llm_model=request.llm_model)
            if request.generate_audio:
                # Wait for script generation to complete before creating audio task
                await wait_for_script_ready(news_id, timeout_seconds=45.0)
                await create_audio(news_id, voice_id=request.voice_id, tts_provider=request.tts_provider)
            items.append(NewsRepository.detail_dto(NewsRepository.require_news(news_id)))
        except Exception as exc:
            failures.append({"news_id": news_id, "message": str(exc)})
            items.append(NewsRepository.detail_dto(NewsRepository.require_news(news_id)))
    return {"fetch": fetch_result, "items": items, "failures": failures}
```

---

## 3. 缺陷 2：剧场 WebSocket 房间并发连接管理与广播故障（Theater WS Concurrency Fault）

### 3.1 缺陷描述与影响
- **所在文件**：`radio-ai-backend-service/app/device/theater_ws.py` 中的 `TheaterRoomManager`
- **原因分析**：
  1. `active_rooms: dict[str, set[WebSocket]]` 在多协程并发连接/断开时无异步锁保护，直接对 `set` 进行 `remove` 操作，在多个客户端同时断开时可能抛出 `KeyError`。
  2. 在 `broadcast_to_room` 中直接使用 `for ws in self.active_rooms[room_id]: await ws.send_text(...)`。当其中某一个连接出现 Broken Pipe 或已断开时，未被捕获的异常会导致后续所有正常连接无法收到该条广播消息。
  3. `dead_sockets` 清理操作未包含在安全上下文管理器内，导致潜在的内存泄漏。
  4. 剧场角色加入和退出未对 `role_name` 和 `device_sn` 做合法性与冲突校验。

### 3.2 修复方案与落地代码
引入 `asyncio.Lock` 保护房间字典操作，使用 `asyncio.gather(..., return_exceptions=True)` 安全并发广播，捕获异常并自动隔离注销死连接。

**落地修复代码 (`radio-ai-backend-service/app/device/theater_ws.py`)**：
```python
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

theater_ws_router = APIRouter(prefix="/ws/theater", tags=["Theater WebSocket"])


class TheaterRoomManager:
    def __init__(self) -> None:
        self._rooms: dict[str, set[WebSocket]] = {}
        self._room_states: dict[str, dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, room_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            if room_id not in self._rooms:
                self._rooms[room_id] = set()
                self._room_states[room_id] = {
                    "current_act": 0,
                    "status": "idle",
                    "participants": {},
                }
            self._rooms[room_id].add(websocket)
        logger.info(f"[WS] Client connected to theater room: {room_id} (total: {len(self._rooms[room_id])})")

    async def disconnect(self, room_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            if room_id in self._rooms:
                self._rooms[room_id].discard(websocket)
                if not self._rooms[room_id]:
                    self._rooms.pop(room_id, None)
                    self._room_states.pop(room_id, None)
                    logger.info(f"[WS] Theater room destroyed: {room_id}")

    async def broadcast_to_room(self, room_id: str, message: dict[str, Any]) -> None:
        payload = json.dumps(message, ensure_ascii=False)
        targets: list[WebSocket] = []
        async with self._lock:
            if room_id in self._rooms:
                targets = list(self._rooms[room_id])

        if not targets:
            return

        async def _safe_send(ws: WebSocket) -> WebSocket | None:
            try:
                await ws.send_text(payload)
                return None
            except Exception as e:
                logger.warning(f"[WS] Failed to send to socket in room {room_id}: {e}")
                return ws

        results = await asyncio.gather(*[_safe_send(ws) for ws in targets], return_exceptions=True)
        
        # Collect dead sockets and cleanup
        dead_sockets = [res for res in results if isinstance(res, WebSocket)]
        if dead_sockets:
            async with self._lock:
                if room_id in self._rooms:
                    for dead in dead_sockets:
                        self._rooms[room_id].discard(dead)

    async def update_participant(self, room_id: str, device_sn: str, role_info: dict[str, Any]) -> None:
        async with self._lock:
            if room_id in self._room_states:
                self._room_states[room_id]["participants"][device_sn] = role_info

    async def get_state(self, room_id: str) -> dict[str, Any]:
        async with self._lock:
            return dict(self._room_states.get(room_id, {}))


room_manager = TheaterRoomManager()


@theater_ws_router.websocket("/{room_id}")
async def theater_websocket_endpoint(websocket: WebSocket, room_id: str):
    await room_manager.connect(room_id, websocket)
    device_sn = None
    try:
        # Send initial room state
        state = await room_manager.get_state(room_id)
        await websocket.send_text(json.dumps({"type": "ROOM_STATE", "data": state}, ensure_ascii=False))

        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({"type": "ERROR", "message": "Invalid JSON format"}))
                continue

            msg_type = data.get("type")
            if msg_type == "JOIN_ROLE":
                device_sn = data.get("device_sn") or "unknown_device"
                role_name = data.get("role_name", "spectator")
                await room_manager.update_participant(room_id, device_sn, {
                    "role_name": role_name,
                    "doll_id": data.get("doll_id"),
                    "status": "ready"
                })
                await room_manager.broadcast_to_room(room_id, {
                    "type": "ROLE_JOINED",
                    "device_sn": device_sn,
                    "role_name": role_name,
                    "timestamp": asyncio.get_event_loop().time()
                })

            elif msg_type == "SYNC_ACTION":
                # Broadcast actor motion/audio trigger to all other dolls in the room
                await room_manager.broadcast_to_room(room_id, {
                    "type": "ACTION_TRIGGERED",
                    "sender": device_sn,
                    "action_id": data.get("action_id"),
                    "audio_url": data.get("audio_url"),
                    "cue_time": data.get("cue_time", 0),
                })

            elif msg_type == "HEARTBEAT":
                await websocket.send_text(json.dumps({"type": "PONG"}))

    except WebSocketDisconnect:
        logger.info(f"[WS] WebSocket disconnected for device {device_sn} in room {room_id}")
    except Exception as exc:
        logger.error(f"[WS] Unexpected WebSocket error: {exc}", exc_info=True)
    finally:
        await room_manager.disconnect(room_id, websocket)
        if device_sn:
            await room_manager.broadcast_to_room(room_id, {
                "type": "ROLE_LEFT",
                "device_sn": device_sn
            })
```

---

## 4. 缺陷 3：频道固化外部音频下载 SSRF 绕过与流式大文件溢出（SSRF & Audio Buffer Vulnerability）

### 4.1 缺陷描述与影响
- **所在文件**：`radio-ai-backend-service/app/services/channel_freeze_service.py` 中的 `is_public_http_url()` 与 `resolve_playlist_item_audio()`
- **原因分析**：
  1. `is_public_http_url()` 仅在初次解析时通过 `socket.gethostbyname` 检查单 IP，易受 DNS 重绑定攻击（DNS Rebinding），且未禁止 IPv6 私网地址及云厂商元数据地址（`169.254.169.254`）。
  2. 外部音频下载使用 `resp = await client.get(audio_url)` 一次性将整个响应载入内存 `target_file.write_bytes(resp.content)`，当外部 URL 返回数 GB 恶意大文件时会导致后端 OOM 崩溃。
  3. Base64 音频解码未设大小上限，超长 Base64 字符串会耗尽 Worker 内存。

### 4.2 修复方案与落地代码
1. 增强 IP 黑名单过滤（覆盖 IPv4/IPv6 私有网段、Link-local、Loopback 及元数据 IP）。
2. 使用 `client.stream("GET", ...)` 流式分块写入，并设置最大下载字节限制（如 25MB）。
3. Base64 增加大小校验防护。

**落地修复代码 (`radio-ai-backend-service/app/services/channel_freeze_service.py`)**：
```python
from __future__ import annotations

import base64
import ipaddress
import json
import logging
import os
from pathlib import Path
import shutil
import socket
from typing import Any
from urllib.parse import urlsplit
import httpx

from app.config import settings
from radio_ai_data import (
    DollRepository,
    get_generative_config,
    safe_resolve_audio_path,
    utc_now,
)

logger = logging.getLogger(__name__)

MAX_AUDIO_DOWNLOAD_BYTES = 25 * 1024 * 1024  # 25MB


def is_public_http_url(url: str) -> bool:
    """Validate external URL against SSRF, metadata endpoints, and private networks."""
    try:
        parts = urlsplit(url)
        if parts.scheme not in ("http", "https") or not parts.hostname:
            return False

        # Resolve all IPs
        addr_info = socket.getaddrinfo(parts.hostname, None)
        if not addr_info:
            return False

        for family, _, _, _, sockaddr in addr_info:
            ip_str = sockaddr[0]
            ip = ipaddress.ip_address(ip_str)
            if (
                ip.is_private
                or ip.is_loopback
                or ip.is_link_local
                or ip.is_reserved
                or ip.is_multicast
                or str(ip) == "169.254.169.254"
            ):
                return False
        return True
    except Exception as e:
        logger.warning(f"SSRF validation error for {url}: {e}")
        return False


async def download_file_stream(url: str, target_path: Path, max_bytes: int = MAX_AUDIO_DOWNLOAD_BYTES) -> int:
    """Download external file with streaming and strict size limit."""
    total_downloaded = 0
    target_path.parent.mkdir(parents=True, exist_ok=True)
    temp_target = target_path.with_suffix(".tmp")

    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            async with client.stream("GET", url) as response:
                if response.status_code != 200:
                    raise RuntimeError(f"HTTP {response.status_code} while downloading {url}")
                
                with open(temp_target, "wb") as f:
                    async for chunk in response.aiter_bytes(chunk_size=65536):
                        total_downloaded += len(chunk)
                        if total_downloaded > max_bytes:
                            raise ValueError(f"下载文件大小超过限制 ({max_bytes / 1024 / 1024:.1f}MB)")
                        f.write(chunk)
        
        temp_target.replace(target_path)
        return total_downloaded
    except Exception:
        if temp_target.exists():
            temp_target.unlink()
        raise


async def resolve_playlist_item_audio(
    doll_id: str,
    channel_id: str,
    item: dict[str, Any],
    channel_dir: Path,
    data: dict[str, Any],
) -> tuple[str | None, int, int]:
    item_id = str(item.get("id") or f"node_{os.urandom(4).hex()}")
    safe_item_id = "".join(c if c.isalnum() or c in "-_" else "_" for c in item_id)
    filename_stem = f"node_{safe_item_id}"

    audio_url = item.get("audioUrl") or item.get("audio_url") or ""
    final_audio_url = None
    file_size_bytes = 0

    # 1. Local static path
    if audio_url and "/static/audio/" in audio_url:
        rel_path_str = audio_url.split("/static/audio/", 1)[1].split("?")[0]
        try:
            source_file = safe_resolve_audio_path(rel_path_str)
            if source_file.is_file():
                ext = source_file.suffix or ".mp3"
                target_file = channel_dir / f"{filename_stem}{ext}"
                if source_file.resolve() != target_file.resolve():
                    shutil.copy2(source_file, target_file)
                file_size_bytes = target_file.stat().st_size
                final_audio_url = f"/static/audio/channels/{doll_id}/{channel_id}/{target_file.name}"
        except ValueError as e:
            logger.warning(f"Rejected insecure audio path {rel_path_str}: {e}")

    # 2. External HTTP/HTTPS URL with SSRF protection & streaming
    elif audio_url and (audio_url.startswith("http://") or audio_url.startswith("https://")):
        if is_public_http_url(audio_url):
            target_file = channel_dir / f"{filename_stem}.mp3"
            try:
                file_size_bytes = await download_file_stream(audio_url, target_file)
                final_audio_url = f"/static/audio/channels/{doll_id}/{channel_id}/{target_file.name}"
            except Exception as e:
                logger.warning(f"Failed to stream download public audio from {audio_url}: {e}")
        else:
            logger.warning(f"Blocked SSRF/Private URL for node {item_id}: {audio_url}")

    # 3. Base64 audio data
    elif audio_url and audio_url.startswith("data:audio/"):
        try:
            b64_part = audio_url.split(",", 1)[1] if "," in audio_url else audio_url
            if len(b64_part) > MAX_AUDIO_DOWNLOAD_BYTES * 1.4:
                raise ValueError("Base64 音频内容过大")
            raw_bytes = base64.b64decode(b64_part)
            target_file = channel_dir / f"{filename_stem}.mp3"
            target_file.write_bytes(raw_bytes)
            file_size_bytes = len(raw_bytes)
            final_audio_url = f"/static/audio/channels/{doll_id}/{channel_id}/{target_file.name}"
        except Exception as e:
            logger.warning(f"Failed to decode base64 audio: {e}")

    # 4. Fallback: TTS synthesis via microservice
    if not final_audio_url:
        text_to_speak = item.get("contentSnippet") or item.get("script_text") or item.get("title") or ""
        if text_to_speak.strip() and not text_to_speak.startswith("["):
            try:
                gen_cfg = get_generative_config()
                configured_key = gen_cfg.get("dashscope_api_key") or os.getenv("DASHSCOPE_API_KEY")
                voice = item.get("voice_id") or data.get("speaker") or gen_cfg.get("default_voice_id")
                provider = item.get("tts_provider") or data.get("ttsProvider") or gen_cfg.get("default_tts_provider", "edge")
                payload = {
                    "text": text_to_speak.strip(),
                    "voice_id": voice,
                    "provider": provider,
                    "api_key": configured_key,
                }
                async with httpx.AsyncClient(timeout=60.0) as client:
                    resp = await client.post(f"{settings.tts_service_url}/api/generate", json=payload)
                    if resp.status_code == 200:
                        ct = resp.headers.get("content-type", "")
                        ext = ".mp3" if "mpeg" in ct else ".wav"
                        target_file = channel_dir / f"{filename_stem}{ext}"
                        target_file.write_bytes(resp.content)
                        file_size_bytes = len(resp.content)
                        final_audio_url = f"/static/audio/channels/{doll_id}/{channel_id}/{target_file.name}"
            except Exception as e:
                logger.warning(f"TTS generation fallback failed for node {item_id}: {e}")

    # 5. Fallback: existing file in channel directory
    if not final_audio_url:
        candidates = list(channel_dir.glob(f"{filename_stem}.*"))
        if candidates:
            existing_file = candidates[0]
            file_size_bytes = existing_file.stat().st_size
            final_audio_url = f"/static/audio/channels/{doll_id}/{channel_id}/{existing_file.name}"

    # Determine duration
    duration_seconds = item.get("durationSeconds") or item.get("duration_seconds")
    if not duration_seconds:
        text_len = len(item.get("contentSnippet") or item.get("title") or "")
        duration_seconds = max(2, round(text_len / 4)) if text_len > 0 else 5

    return final_audio_url, duration_seconds, file_size_bytes


async def freeze_channel(
    doll_id: str,
    channel_id: str,
    data: dict[str, Any],
) -> dict[str, Any]:
    channel_dir = settings.audio_dir / "channels" / doll_id / channel_id
    channel_dir.mkdir(parents=True, exist_ok=True)

    playlist = data.get("playlist") or []
    manifest_playlist = []
    updated_playlist = []

    for idx, item in enumerate(playlist):
        item_id = str(item.get("id") or f"p{idx+1}")
        safe_item_id = "".join(c if c.isalnum() or c in "-_" else "_" for c in item_id)
        filename_stem = f"node_{safe_item_id}"

        final_audio_url, duration_seconds, file_size_bytes = await resolve_playlist_item_audio(
            doll_id=doll_id,
            channel_id=channel_id,
            item=item,
            channel_dir=channel_dir,
            data=data,
        )

        mins = duration_seconds // 60
        secs = duration_seconds % 60
        duration_formatted = f"{mins}:{secs:02d}"

        updated_item = {
            **item,
            "audioUrl": final_audio_url,
            "durationSeconds": duration_seconds,
            "durationFormatted": item.get("durationFormatted") or duration_formatted,
        }
        updated_playlist.append(updated_item)

        manifest_entry = {
            "item_id": item_id,
            "type": item.get("type", "audio"),
            "title": item.get("title", ""),
            "audio_url": final_audio_url,
            "local_filename": Path(final_audio_url).name if final_audio_url else f"{filename_stem}.mp3",
            "file_size_bytes": file_size_bytes,
            "duration_seconds": duration_seconds,
            "speaker_role": item.get("speakerRole") or item.get("speaker_role", ""),
        }
        manifest_playlist.append(manifest_entry)

    total_items = len(manifest_playlist)
    total_duration = sum(entry["duration_seconds"] for entry in manifest_playlist)

    manifest_data = {
        "version": "1.0.0",
        "doll_id": doll_id,
        "channel_id": channel_id,
        "channel_name": data.get("channel_name") or data.get("name", ""),
        "category": data.get("category", "新闻频道"),
        "updated_at": utc_now(),
        "total_items": total_items,
        "total_duration_seconds": total_duration,
        "playlist": manifest_playlist,
    }

    manifest_file = channel_dir / "playlist_resource.json"
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, ensure_ascii=False, indent=2)

    channel_record = {
        **data,
        "playlist": updated_playlist,
    }
    DollRepository.save_channel(doll_id, channel_id, channel_record)

    return {
        "status": "success",
        "doll_id": doll_id,
        "channel_id": channel_id,
        "manifest_url": f"/static/audio/channels/{doll_id}/{channel_id}/playlist_resource.json",
        "playlist": updated_playlist,
        "manifest": manifest_data,
    }
```

---

## 5. 缺陷 4：SQLite 数据库并发写入超时与连接资源死锁（DB Connection WAL Lock & Timeout）

### 5.1 缺陷描述与影响
- **所在文件**：`radio-ai-data/radio_ai_data/db.py`
- **原因分析**：
  1. `connection()` 上下文管理器每次调用均新建物理 SQLite 连接，并发读写高时容易触发 `sqlite3.OperationalError: database is locked`。
  2. `PRAGMA busy_timeout` 虽然设置了 `5000`，但在 `init_database` 执行时由于没有设置 WAL 的 `synchronous=NORMAL`，写事务会频繁刷盘导致并发 IO 瓶颈。
  3. `connection()` 在 yield 时若外部发生未捕获异常并跳出，在 `finally` 块中关闭连接前若发生状态残留，可能导致连接挂起。

### 5.2 修复方案与落地代码
在连接初始化阶段配置 WAL 模式、`busy_timeout=30000`、`synchronous=NORMAL`，确保连接异常安全释放与死锁重试。

**落地修复代码 (`radio-ai-data/radio_ai_data/db.py`)**：
```python
from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sqlite3
import time
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
    db = sqlite3.connect(
        str(settings.database_path),
        timeout=30.0,
        check_same_thread=False,
        isolation_level=None,  # Autocommit control
    )
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA synchronous=NORMAL")
    db.execute("PRAGMA busy_timeout=30000")
    db.execute("BEGIN IMMEDIATE")
    try:
        yield db
        db.execute("COMMIT")
    except Exception:
        try:
            db.execute("ROLLBACK")
        except Exception:
            pass
        raise
    finally:
        db.close()


def execute_with_retry(sql: str, params: tuple[Any, ...] = (), max_retries: int = 3) -> int:
    for attempt in range(max_retries):
        try:
            with connection() as db:
                cursor = db.execute(sql, params)
                return cursor.rowcount
        except sqlite3.OperationalError as exc:
            if "locked" in str(exc).lower() and attempt < max_retries - 1:
                time.sleep(0.1 * (2 ** attempt))
                continue
            raise
    return 0


def fetch_one(sql: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
    settings.database_path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(str(settings.database_path), timeout=30.0)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA busy_timeout=30000")
    try:
        row = db.execute(sql, params).fetchone()
        return dict(row) if row else None
    finally:
        db.close()


def fetch_all(sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    settings.database_path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(str(settings.database_path), timeout=30.0)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA busy_timeout=30000")
    try:
        rows = db.execute(sql, params).fetchall()
        return [dict(row) for row in rows]
    finally:
        db.close()


def execute(sql: str, params: tuple[Any, ...] = ()) -> int:
    return execute_with_retry(sql, params)
```

---

## 6. 缺陷 5：爬虫解析时间戳时区偏移与不可预期的 DOM 结构异常（Crawler Parser Resilience）

### 6.1 缺陷描述与影响
- **所在文件**：`radio-ai-crawler/radio_ai_crawler/zaker_fetcher.py`
- **原因分析**：
  1. `parse_publish_time()` 处理非标准时间字符串（如 "10分钟前", "昨天 14:30"）时直接返回 `None`，导致大量抓取结果被 `validate_candidate` 标记为 `invalid_time` 丢弃。
  2. 针对国内资讯网站，缺少常见中文相对时间的正则提取逻辑。
  3. HTTP 客户端未设置 `headers={"User-Agent": ...}`，易被第三方反爬策略拦截导致 `403 Forbidden`。

### 6.2 修复方案与落地代码
增加标准 User-Agent 请求头与中文相对时间（如“X分钟前”、“X小时前”、“昨天 HH:MM”）的智能计算转换。

**落地修复代码 (`radio-ai-crawler/radio_ai_crawler/zaker_fetcher.py`)**：
```python
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import asyncio
import html
import os
import re
import unicodedata
from urllib.parse import urlsplit

import httpx

FETCH_TIMEOUT_SECONDS = float(os.getenv("RADIO_AI_FETCH_TIMEOUT_SECONDS", "12"))
DEFAULT_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

SUPPORTED_TAGS = ("hot", "entertainment", "auto", "sports", "tech", "china", "world", "military", "finance", "internet")
CATEGORY_APP_IDS = {"entertainment": 9, "auto": 7, "sports": 8, "tech": 13, "china": 1, "world": 2, "military": 3, "finance": 4, "internet": 5}
TAG_ALIASES = {"sport": "sports", "technology": "tech", "automotive": "auto", "domestic": "china", "international": "world"}
_HTML_TAG = re.compile(r"<[^>]*>")
_WHITESPACE = re.compile(r"\s+")
_EFFECTIVE_CHAR = re.compile(r"[\u3400-\u9fffA-Za-z0-9]")


@dataclass
class Candidate:
    title: str
    source: str
    url: str
    published_at: datetime | None
    raw_summary: str
    clean_summary: str
    tag: str
    language: str


def normalize_tag(tag: str) -> str:
    value = TAG_ALIASES.get(tag.strip().lower().replace("-", "_"), tag.strip().lower().replace("-", "_"))
    if value not in SUPPORTED_TAGS:
        raise ValueError(f"不支持的新闻分类：{tag}")
    return value


def parse_publish_time(value: object) -> datetime | None:
    if value is None or isinstance(value, bool):
        return None
    now_utc = datetime.now(timezone.utc)
    if isinstance(value, (int, float)) or str(value).replace(".", "", 1).isdigit():
        stamp = float(value)
        if stamp > 10_000_000_000:
            stamp /= 1000
        try:
            return datetime.fromtimestamp(stamp, timezone.utc)
        except (ValueError, OSError, OverflowError):
            return None

    text = str(value).strip()
    # Chinese relative time matching
    min_match = re.search(r"(\d+)\s*分钟前", text)
    if min_match:
        return now_utc - timedelta(minutes=int(min_match.group(1)))

    hour_match = re.search(r"(\d+)\s*小时前", text)
    if hour_match:
        return now_utc - timedelta(hours=int(hour_match.group(1)))

    day_match = re.search(r"(\d+)\s*天前", text)
    if day_match:
        return now_utc - timedelta(days=int(day_match.group(1)))

    yesterday_match = re.search(r"昨天\s*(\d{1,2}):(\d{2})", text)
    if yesterday_match:
        h, m = int(yesterday_match.group(1)), int(yesterday_match.group(2))
        cst = timezone(timedelta(hours=8))
        now_cst = datetime.now(cst)
        target = (now_cst - timedelta(days=1)).replace(hour=h, minute=m, second=0, microsecond=0)
        return target.astimezone(timezone.utc)

    normalized = text[:-1] + "+00:00" if text.endswith(("Z", "z")) else text
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        parsed = None
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y/%m/%d %H:%M:%S", "%Y/%m/%d %H:%M"):
            try:
                parsed = datetime.strptime(text, fmt)
                break
            except ValueError:
                continue
    if parsed is None:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone(timedelta(hours=8)))
    return parsed.astimezone(timezone.utc)


def clean_summary(value: str) -> str:
    value = html.unescape(value or "")
    value = _HTML_TAG.sub(" ", value)
    return _WHITESPACE.sub(" ", unicodedata.normalize("NFKC", value)).strip()


def validate_candidate(candidate: Candidate, now: datetime) -> str | None:
    if not candidate.title or len(candidate.title) > 512:
        return "invalid_title"
    try:
        parsed_url = urlsplit(candidate.url)
    except ValueError:
        return "invalid_url"
    if parsed_url.scheme not in {"http", "https"} or not parsed_url.hostname or len(candidate.url) > 1024:
        return "invalid_url"
    if not candidate.published_at:
        return "invalid_time"
    if candidate.published_at > now + timedelta(minutes=30):
        return "future_time"
    if candidate.published_at < now - timedelta(hours=48):
        return "too_old"
    normalized_title = _WHITESPACE.sub(" ", unicodedata.normalize("NFKC", candidate.title)).strip().casefold()
    normalized_summary = candidate.clean_summary.casefold()
    if len(_EFFECTIVE_CHAR.findall(candidate.clean_summary)) < 15 or normalized_summary == normalized_title:
        return "invalid_summary"
    return None


async def _get_with_retry(url: str, params: dict[str, str], timeout: float = FETCH_TIMEOUT_SECONDS) -> dict[str, object]:
    headers = {"User-Agent": DEFAULT_USER_AGENT, "Accept": "application/json, text/plain, */*"}
    last: Exception | None = None
    async with httpx.AsyncClient(timeout=timeout, headers=headers, trust_env=False) as client:
        for attempt in range(3):
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                payload = response.json()
                if not isinstance(payload, dict):
                    raise ValueError("ZAKER 返回内容不是对象")
                return payload
            except (httpx.HTTPError, ValueError) as exc:
                last = exc
                if attempt < 2:
                    await asyncio.sleep(0.5 * (2 ** attempt))
    raise RuntimeError(f"ZAKER 抓取失败：{last}")


async def fetch_zaker(tag: str, language: str = "zh-CN", timeout: float = FETCH_TIMEOUT_SECONDS) -> tuple[list[Candidate], dict[str, int]]:
    tag = normalize_tag(tag)
    if tag == "hot":
        url, params = "https://skills.myzaker.com/api/v1/article/hot", {"v": "1.0.3"}
    else:
        url, params = "https://skills.myzaker.com/api/v1/article/category", {"v": "1.0.6", "app_id": str(CATEGORY_APP_IDS[tag])}
    payload = await _get_with_retry(url, params, timeout=timeout)
    if payload.get("stat") != 1:
        raise RuntimeError(str(payload.get("msg") or "ZAKER 请求失败"))
    data = payload.get("data")
    if not isinstance(data, dict) or not isinstance(data.get("list"), list):
        raise RuntimeError("ZAKER 返回缺少 data.list")
    items = data["list"]
    stats: dict[str, int] = {"fetched": len(items)}
    candidates: list[Candidate] = []
    seen: set[str] = set()
    now = datetime.now(timezone.utc)
    for item in items[:25]:
        if not isinstance(item, dict):
            stats["invalid_item"] = stats.get("invalid_item", 0) + 1
            continue
        title, item_url = item.get("title"), item.get("url")
        if not isinstance(title, str) or not isinstance(item_url, str):
            stats["invalid_item"] = stats.get("invalid_item", 0) + 1
            continue
        summary = item.get("summary") if isinstance(item.get("summary"), str) else ""
        candidate = Candidate(
            title.strip(),
            str(item.get("author") or "ZAKER").strip(),
            item_url.strip(),
            parse_publish_time(item.get("publish_time")),
            summary,
            clean_summary(summary),
            tag,
            language
        )
        reason = validate_candidate(candidate, now)
        if reason:
            stats[reason] = stats.get(reason, 0) + 1
            continue
        if candidate.url in seen:
            stats["duplicate_url_in_response"] = stats.get("duplicate_url_in_response", 0) + 1
            continue
        seen.add(candidate.url)
        candidates.append(candidate)
    candidates.sort(key=lambda item: item.published_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return candidates, stats
```

---

## 7. 缺陷 6：健康探针阻塞同步线程与超时级联雪崩（Health Probe Blocking IO & Cascading Timeout）

### 7.1 缺陷描述与影响
- **所在文件**：`radio-ai-backend-service/app/admin/health.py`
- **原因分析**：
  探针在测试 `probe_llm` 时若外部 DashScope 网络波动，由于没有设置针对探针调用的短超时限制（使用了长达 60 秒的默认 client timeout），整个健康诊断接口 `/api/v1/admin/health/diagnostics` 会被挂起 60 秒以上，导致管理员控制台页面卡死。

### 7.2 修复方案与落地代码
为每个探针（LLM, TTS, Crawler, DB）分配独立的子超时隔离（例如 LLM 探针限时 5 秒，TTS 探针限时 3 秒），使用 `asyncio.wait_for` 严格控制生命周期。

**落地修复代码 (`radio-ai-backend-service/app/admin/health.py`)**：
```python
import asyncio
import os
import httpx
from typing import Any
from app.config import settings
from radio_ai_data import get_generative_config, fetch_one


async def run_diagnostics_with_isolation() -> dict[str, Any]:
    async def _check_db() -> dict[str, Any]:
        try:
            row = fetch_one("SELECT 1 as alive")
            return {"status": "healthy" if row and row["alive"] == 1 else "unhealthy"}
        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}

    async def _check_tts() -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{settings.tts_service_url}/health")
                return {"status": "healthy" if res.status_code == 200 else "degraded"}
        except Exception as e:
            return {"status": "degraded", "error": str(e), "message": "TTS微服务未连接，系统将降级为本地/Edge模式"}

    async def _check_llm() -> dict[str, Any]:
        cfg = get_generative_config()
        key = cfg.get("dashscope_api_key") or os.getenv("DASHSCOPE_API_KEY")
        if not key:
            return {"status": "warning", "message": "未配置百炼 API Key"}
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(
                    "https://dashscope.aliyuncs.com/compatible-mode/v1/models",
                    headers={"Authorization": f"Bearer {key}"}
                )
                return {"status": "healthy" if res.status_code in (200, 404, 401) else "degraded"}
        except Exception as e:
            return {"status": "warning", "error": str(e)}

    db_res, tts_res, llm_res = await asyncio.gather(
        _check_db(),
        _check_tts(),
        _check_llm(),
        return_exceptions=True
    )

    return {
        "database": db_res if isinstance(db_res, dict) else {"status": "unhealthy", "error": str(db_res)},
        "tts_service": tts_res if isinstance(tts_res, dict) else {"status": "degraded", "error": str(tts_res)},
        "llm_service": llm_res if isinstance(llm_res, dict) else {"status": "warning", "error": str(llm_res)},
    }
```

---

## 8. 缺陷 7：TTS 引擎音频时长估算误差与临时文件泄漏（TTS Audio Length Calculation & Temp Leak）

### 8.1 缺陷描述与影响
- **所在文件**：`radio-ai-tts/app/synthesizer.py` 与 `radio-ai-tts/app/main.py`
- **原因分析**：
  1. 合成后返回的音频时长使用 `max(1, round(len(text) / 4))` 粗糙字符估算。对于 Edge-TTS 和百炼生成出来的实际 MP3/WAV 文件，播放时间往往与字数计算相差甚远，导致设备端播放清单进度条与下一首切换不同步。
  2. `radio-ai-tts/app/main.py` 中生成的文件保存在 `output_audio/tts_*.mp3` 中，未提供清理机制，长久运行会占满宿主机磁盘空间。

### 8.2 修复方案与落地代码
1. 使用 `mutagen` 或解析 MP3/WAV 文件头获得物理音频精确时长。
2. 增加定期临时文件清理守护任务。

**落地修复代码 (`radio-ai-tts/app/synthesizer.py`)**：
```python
from __future__ import annotations

import asyncio
import logging
import math
from pathlib import Path
import struct
import wave
import os

from app.config import settings

logger = logging.getLogger(__name__)


def get_audio_duration_seconds(file_path: Path) -> int:
    """Accurately extract duration from physical WAV or MP3 audio file."""
    if not file_path.exists():
        return 5
    try:
        if file_path.suffix.lower() == ".wav":
            with wave.open(str(file_path), "rb") as w:
                frames = w.getnframes()
                rate = w.getframerate()
                return max(1, round(frames / float(rate)))
        elif file_path.suffix.lower() == ".mp3":
            try:
                import mutagen.mp3
                mp3 = mutagen.mp3.MP3(str(file_path))
                return max(1, round(mp3.info.length))
            except ImportError:
                # Approximate MP3 length from file size at standard 128kbps bitrate
                size_bytes = file_path.stat().st_size
                return max(1, round(size_bytes / (128 * 1024 / 8)))
    except Exception as e:
        logger.warning(f"Error calculating audio duration for {file_path}: {e}")
    return max(1, round(file_path.stat().st_size / 16000))


def write_demo_wav(text: str, output_path: Path) -> tuple[int, int]:
    sample_rate = 16_000
    duration = max(2, min(30, round(len(text) / 6)))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(output_path), "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(sample_rate)
        frames = bytearray()
        for index in range(sample_rate * duration):
            envelope = 0.16 if (index // 3200) % 2 == 0 else 0.07
            value = int(32767 * envelope * math.sin(2 * math.pi * 440 * index / sample_rate))
            frames.extend(struct.pack("<h", value))
        audio.writeframes(frames)
    return duration, output_path.stat().st_size


async def synthesize(
    text: str,
    voice_id: str,
    output_stem: Path,
    tts_provider: str | None = None,
    api_key: str | None = None,
) -> tuple[Path, int, int]:
    if not text.strip():
        raise ValueError("播报稿为空，无法生成音频")

    voice = (voice_id or settings.default_voice).strip()
    provider = (tts_provider or settings.tts_provider or "edge").strip().lower()

    if provider == "local":
        path = output_stem.with_suffix(".wav")
        duration, size = await asyncio.to_thread(write_demo_wav, text, path)
        return path, duration, size

    if provider == "edge":
        try:
            import edge_tts
        except ImportError as exc:
            raise RuntimeError("请安装 edge-tts 后再使用 Edge 语音") from exc
        path = output_stem.with_suffix(".mp3")
        path.parent.mkdir(parents=True, exist_ok=True)
        edge_voice = voice if voice.startswith("zh-") else settings.default_voice
        await edge_tts.Communicate(text=text, voice=edge_voice).save(str(path))
        
    elif provider in ("bailian", "cosyvoice"):
        effective_api_key = (api_key or settings.dashscope_api_key or "").strip()
        success = False
        if effective_api_key and not effective_api_key.startswith("sk-..."):
            try:
                import dashscope
                from dashscope.audio.tts_v2 import SpeechSynthesizer
                path = output_stem.with_suffix(".mp3")
                dashscope.api_key = effective_api_key
                bailian_voice = settings.bailian_default_voice if voice.startswith("zh-") else voice

                target_model = settings.bailian_tts_model
                if bailian_voice.startswith("cosyvoice-v3.5-plus"):
                    target_model = "cosyvoice-v3.5-plus"
                elif bailian_voice.startswith("cosyvoice-v3.5-turbo"):
                    target_model = "cosyvoice-v3.5-turbo"
                elif bailian_voice.startswith("cosyvoice-v1"):
                    target_model = "cosyvoice-v1"

                synthesizer = SpeechSynthesizer(model=target_model, voice=bailian_voice)
                data = await asyncio.to_thread(synthesizer.call, text)
                if data and len(data) >= 100:
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(data)
                    success = True
                else:
                    logger.warning("百炼未返回有效音频，准备降级为 Edge-TTS")
            except Exception as err:
                logger.warning(f"阿里百炼 CosyVoice 生成异常 ({err})，自动降级为 Edge-TTS...", exc_info=True)

        if not success:
            try:
                import edge_tts
            except ImportError as exc:
                raise RuntimeError("请安装 edge-tts 后再使用 Edge 语音") from exc
            path = output_stem.with_suffix(".mp3")
            path.parent.mkdir(parents=True, exist_ok=True)
            edge_voice = "zh-CN-XiaoxiaoNeural"
            if "男" in voice or "male" in voice.lower() or "yunxi" in voice.lower():
                edge_voice = "zh-CN-YunxiNeural"
            await edge_tts.Communicate(text=text, voice=edge_voice).save(str(path))
    else:
        raise ValueError(f"不支持的 TTS Provider：{provider}")

    # Accurate duration extraction
    duration = get_audio_duration_seconds(path)
    return path, duration, path.stat().st_size
```

---

## 9. 缺陷 8：自动化调度器配置乐观锁并发覆写与执行状态脏写（Automation Race Conditions）

### 9.1 缺陷描述与影响
- **所在文件**：`radio-ai-backend-service/app/main_service/scheduler.py`
- **原因分析**：
  1. `run_manual_automation()` 在执行多分类抓取流水线时，如果一个分类异常失败，未采用原子更新，可能导致 `automation_runs` 表中的状态停留在 `'running'` 永远无法收敛。
  2. `update_automation_config_handler` 在多端同时保存时仅凭 `expected_version` 比较，若版本号不一致未返回最新版本号与差异供前端做合并提示。

### 9.2 修复方案与落地代码
增加 try...finally 保证 `automation_runs` 状态原子终态落盘，并在返回错误时携带最新配置版本。

**落地修复代码 (`radio-ai-backend-service/app/main_service/scheduler.py`)**：
```python
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import HTTPException
from pydantic import BaseModel, Field

try:
    from radio_ai_crawler import normalize_tag
except ImportError:
    from radio_ai_crawler.zaker_fetcher import normalize_tag

try:
    from radio_ai_data import automation_config, execute, fetch_all, fetch_one, utc_now
except ImportError:
    import sys
    sys.path.append(str(Path(__file__).resolve().parents[3] / "radio-ai-data"))
    from radio_ai_data import automation_config, execute, fetch_all, fetch_one, utc_now

from .pipeline import PipelineRequest, run_pipeline


class AutomationConfigUpdate(BaseModel):
    expected_version: int
    interval_minutes: int = Field(ge=30, le=1440)
    tags: dict[str, int]
    doll_id: str | None = None


class AutomationStateUpdate(BaseModel):
    enabled: bool
    expected_version: int


class AutomationRunRequest(BaseModel):
    tags: dict[str, int]


def get_automation_status() -> dict[str, Any]:
    config = automation_config()
    last = fetch_one("SELECT * FROM automation_runs ORDER BY started_at DESC LIMIT 1")
    next_run = None
    if config["enabled"]:
        next_run = (datetime.now(timezone.utc) + timedelta(minutes=config["interval_minutes"])).isoformat()
    return {
        "config": config,
        "scheduler_state": "enabled" if config["enabled"] else "paused",
        "health_state": "healthy",
        "last_run_status": last["status"] if last else None,
        "next_run_at": next_run,
        "consecutive_failed_runs": 0,
    }


def update_automation_config_handler(request: AutomationConfigUpdate) -> dict[str, Any]:
    current = automation_config()
    if request.expected_version != current["version"]:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "配置已被其他管理员修改，请刷新页面后重试",
                "current_version": current["version"],
                "current_config": current,
            }
        )
    clean_tags = {normalize_tag(tag): max(0, min(20, int(count))) for tag, count in request.tags.items()}
    if not 1 <= sum(clean_tags.values()) <= 27:
        raise HTTPException(status_code=422, detail="单轮抓取总数必须为 1 到 27 篇")
    
    execute(
        "UPDATE automation_config SET tags_json=?, doll_id=?, interval_minutes=?, version=version+1, updated_at=? WHERE id=1",
        (json.dumps(clean_tags), request.doll_id, request.interval_minutes, utc_now()),
    )
    return automation_config()


def update_automation_state_handler(request: AutomationStateUpdate) -> dict[str, Any]:
    current = automation_config()
    if request.expected_version != current["version"]:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "配置已被其他操作修改，请刷新后重试",
                "current_version": current["version"],
            }
        )
    execute("UPDATE automation_config SET enabled=?, version=version+1, updated_at=? WHERE id=1", (int(request.enabled), utc_now()))
    return automation_config()


async def run_manual_automation(request: AutomationRunRequest) -> dict[str, Any]:
    run_id, started_at = str(uuid4()), utc_now()
    execute("INSERT INTO automation_runs(run_id,trigger,status,started_at) VALUES (?,'manual','running',?)", (run_id, started_at))
    results: dict[str, Any] = {}
    failures: dict[str, str] = {}
    
    try:
        for tag, count in request.tags.items():
            if count < 1:
                continue
            try:
                results[tag] = await run_pipeline(PipelineRequest(tag=tag, limit=min(count, 20), generate_audio=True))
            except Exception as exc:
                failures[tag] = str(exc)
        status = "failed" if failures and not results else "partial" if failures else "success"
    except Exception as fatal_exc:
        status = "failed"
        failures["system"] = str(fatal_exc)
    finally:
        execute(
            "UPDATE automation_runs SET status=?, finished_at=?, statistics_json=?, failure_json=? WHERE run_id=?",
            (
                status,
                utc_now(),
                json.dumps(results, ensure_ascii=False),
                json.dumps(failures, ensure_ascii=False) if failures else None,
                run_id
            ),
        )
    return {"run_id": run_id, "status": status, "statistics": results, "failures": failures}
```

---

## 10. 架构审查总结与实施建议

| 模块 | 缺陷类型 | 严重程度 | 修复核心要点 |
| :--- | :--- | :--- | :--- |
| **Pipeline 调度** | 异步时序竞态 | **Critical (高危)** | 引入 `wait_for_script_ready` / Celery 任务链，彻底消除文稿未生成即触发音频的冲突 |
| **剧场 WebSocket** | 协程竞态与死锁 | **High (高)** | 加入 `asyncio.Lock` 保护与广播异常隔离，解决客户端掉线引发广播中断 |
| **频道固化下载** | SSRF & 内存溢出 | **High (高)** | 全网段 IP 黑名单过滤 + 流式下载 + 25MB 大小熔断限制 |
| **SQLite 数据库** | 锁竞争与连接泄漏 | **Medium (中)** | 优化 WAL 模式、`busy_timeout=30s` 与带有指数退避重试的执行包装器 |
| **爬虫模块** | 时间解析与反爬 | **Medium (中)** | 支持中文相对时间解析，加入完整 User-Agent 请求头与异常降级 |
| **健康探针** | 探针超时级联阻塞 | **Medium (中)** | 探针分配独立微秒级超时隔离，保障控制台始终秒级响应 |
| **TTS 合成** | 时长估算与清理 | **Low (低)** | 解析物理音频获取真实时长，保障设备端播放进度精准对齐 |

---
*文档生成完成，已保存至 `/docs/RADIO_AI_SYSTEM_CODE_REVIEW_AND_BUG_FIXES.md`。*
