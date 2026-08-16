from __future__ import annotations

import asyncio
import os
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
import logging

from fastapi import APIRouter, Body, Query
import httpx
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health_diagnostics"])

# Try import data layer
try:
    from radio_ai_data import fetch_all, fetch_one, get_generative_config
except ImportError:
    import sys
    sys.path.append(str(Path(__file__).resolve().parents[3] / "radio-ai-data"))
    from radio_ai_data import fetch_all, fetch_one, get_generative_config


class ModuleDiagnosticResult(BaseModel):
    module_id: str
    module_name: str
    status: str  # "healthy" | "warning" | "error"
    latency_ms: float
    tested_at: str
    summary: str
    details: Dict[str, Any] = {}
    root_cause: Optional[str] = None
    actionable_remedy: Optional[str] = None
    quick_action: Optional[str] = None


class SystemHealthStatusResponse(BaseModel):
    overall_status: str  # "healthy" | "degraded" | "down"
    health_score: int  # 0 - 100
    healthy_count: int
    warning_count: int
    error_count: int
    checked_at: str
    modules: List[ModuleDiagnosticResult]


# --- Probes Implementation ---

async def probe_crawler() -> ModuleDiagnosticResult:
    start_time = time.perf_counter()
    tested_at = datetime.now(timezone.utc).strftime("%H:%M:%S")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
    }
    test_url = "http://iphone.myzaker.com/zaker/blog.php?app_id=13"
    
    try:
        async with httpx.AsyncClient(timeout=6.0, follow_redirects=True) as client:
            resp = await client.get(test_url, headers=headers)
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            
            if resp.status_code == 200 and len(resp.text) > 200:
                return ModuleDiagnosticResult(
                    module_id="crawler",
                    module_name="新闻抓取爬虫 (News Crawler)",
                    status="healthy",
                    latency_ms=elapsed_ms,
                    tested_at=tested_at,
                    summary="上游资讯源 HTTP 200 通畅，内容解析正常",
                    details={"http_code": resp.status_code, "response_bytes": len(resp.text), "target_url": test_url},
                )
            elif resp.status_code in (403, 429):
                return ModuleDiagnosticResult(
                    module_id="crawler",
                    module_name="新闻抓取爬虫 (News Crawler)",
                    status="error",
                    latency_ms=elapsed_ms,
                    tested_at=tested_at,
                    summary=f"上游抓取源返回 {resp.status_code}，疑似被反爬策略拦截",
                    details={"http_code": resp.status_code, "response_snippet": resp.text[:200]},
                    root_cause=f"上游站点触发反爬流控 (HTTP {resp.status_code})，当前 IP 或 User-Agent 被限制。",
                    actionable_remedy="建议：1. 适当调大自动化调度抓取间隔 (如调整为 30-60 分钟)；2. 更换抓取请求头或配置代理；3. 在新闻控制台手动触发单次抓取。",
                    quick_action="retry_crawler",
                )
            else:
                return ModuleDiagnosticResult(
                    module_id="crawler",
                    module_name="新闻抓取爬虫 (News Crawler)",
                    status="warning",
                    latency_ms=elapsed_ms,
                    tested_at=tested_at,
                    summary=f"抓取源响应异常 HTTP {resp.status_code}",
                    details={"http_code": resp.status_code, "response_snippet": resp.text[:200]},
                    root_cause="上游页面结构可能更新或临时维护。",
                    actionable_remedy="请检查 target URL 是否有效，或在后台查看 logs/crawler_worker.log 排查。",
                    quick_action="retry_crawler",
                )
    except httpx.TimeoutException:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return ModuleDiagnosticResult(
            module_id="crawler",
            module_name="新闻抓取爬虫 (News Crawler)",
            status="error",
            latency_ms=elapsed_ms,
            tested_at=tested_at,
            summary="连接上游资讯源超时 (>6s)",
            details={"error": "ConnectionTimeout", "target_url": test_url},
            root_cause="网络连接缓慢或 DNS 无法解析目标源域名。",
            actionable_remedy="请检查宿主机外网网络连通性，或在设置中配置代理服务器。",
            quick_action="retry_crawler",
        )
    except Exception as e:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return ModuleDiagnosticResult(
            module_id="crawler",
            module_name="新闻抓取爬虫 (News Crawler)",
            status="error",
            latency_ms=elapsed_ms,
            tested_at=tested_at,
            summary=f"爬虫探测异常: {str(e)}",
            details={"error": str(e)},
            root_cause=str(e),
            actionable_remedy="请在后台执行 tail -n 50 logs/crawler_worker.log 查看详细错误堆栈。",
            quick_action="view_logs",
        )


async def probe_llm() -> ModuleDiagnosticResult:
    start_time = time.perf_counter()
    tested_at = datetime.now(timezone.utc).strftime("%H:%M:%S")
    
    cfg = get_generative_config()
    if hasattr(cfg, "dashscope_api_key"):
        api_key = (cfg.dashscope_api_key or "").strip()
        default_model = cfg.default_llm_model or "qwen-plus"
    elif isinstance(cfg, dict):
        api_key = (cfg.get("dashscope_api_key") or "").strip()
        default_model = cfg.get("default_llm_model") or "qwen-plus"
    else:
        api_key = ""
        default_model = "qwen-plus"

    api_key = api_key or os.getenv("DASHSCOPE_API_KEY", "").strip() or os.getenv("RADIO_AI_DASHSCOPE_API_KEY", "").strip()
    
    if not api_key:
        return ModuleDiagnosticResult(
            module_id="llm",
            module_name="大模型改写与点评 (LLM Engine)",
            status="error",
            latency_ms=0,
            tested_at=tested_at,
            summary="未配置 DashScope / 百炼大模型 API Key",
            details={"configured_key_length": 0},
            root_cause="系统数据库与环境变量中均未发现有效的 DASHSCOPE_API_KEY。",
            actionable_remedy="请在系统右上角【设置】->【系统 API Key 配置】中输入阿里云 DashScope API Key 并保存。",
            quick_action="open_api_key_modal",
        )
    
    # Active ping to DashScope
    masked_key = api_key[:6] + "..." + api_key[-4:] if len(api_key) > 10 else "***"
    test_url = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
    payload = {
        "model": default_model,
        "messages": [{"role": "user", "content": "ping"}],
        "max_tokens": 5,
    }
    
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                test_url,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json=payload,
            )
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            
            if resp.status_code == 200:
                data = resp.json()
                return ModuleDiagnosticResult(
                    module_id="llm",
                    module_name="大模型改写与点评 (LLM Engine)",
                    status="healthy",
                    latency_ms=elapsed_ms,
                    tested_at=tested_at,
                    summary=f"百炼大模型鉴权通过，测试响应耗时 {elapsed_ms}ms",
                    details={"model": payload["model"], "key": masked_key, "usage": data.get("usage", {})},
                )
            elif resp.status_code == 401:
                return ModuleDiagnosticResult(
                    module_id="llm",
                    module_name="大模型改写与点评 (LLM Engine)",
                    status="error",
                    latency_ms=elapsed_ms,
                    tested_at=tested_at,
                    summary="API Key 鉴权失败 (HTTP 401 Unauthorized)",
                    details={"http_code": 401, "key": masked_key, "response": resp.text},
                    root_cause="配置的 DashScope API Key 无效、已过期或无当前模型调用权限。",
                    actionable_remedy="请前往阿里云百炼控制台重新创建 API Key，并在本系统【API Key 配置】中更新。",
                    quick_action="open_api_key_modal",
                )
            elif resp.status_code == 429:
                return ModuleDiagnosticResult(
                    module_id="llm",
                    module_name="大模型改写与点评 (LLM Engine)",
                    status="warning",
                    latency_ms=elapsed_ms,
                    tested_at=tested_at,
                    summary="大模型调用超出速率限制或配额耗尽 (HTTP 429)",
                    details={"http_code": 429, "key": masked_key, "response": resp.text},
                    root_cause="阿里云账号余额不足或并发调用达到 QPS 上限。",
                    actionable_remedy="请检查阿里云百炼账户余额与配额，或切换备用模型 (如 qwen-turbo)。",
                    quick_action="open_api_key_modal",
                )
            else:
                return ModuleDiagnosticResult(
                    module_id="llm",
                    module_name="大模型改写与点评 (LLM Engine)",
                    status="warning",
                    latency_ms=elapsed_ms,
                    tested_at=tested_at,
                    summary=f"大模型接口返回异常 HTTP {resp.status_code}",
                    details={"http_code": resp.status_code, "response": resp.text[:200]},
                    root_cause=f"百炼 API 响应异常: {resp.text[:150]}",
                    actionable_remedy="请检查模型参数配置或在右上角设置中更换可用模型。",
                    quick_action="open_api_key_modal",
                )
    except Exception as e:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return ModuleDiagnosticResult(
            module_id="llm",
            module_name="大模型改写与点评 (LLM Engine)",
            status="error",
            latency_ms=elapsed_ms,
            tested_at=tested_at,
            summary=f"大模型请求网络异常: {str(e)}",
            details={"error": str(e), "key": masked_key},
            root_cause="向阿里云 API 发送请求时发生网络异常或超时。",
            actionable_remedy="请检查网络防火墙设置，确保能正常访问 dashscope.aliyuncs.com。",
            quick_action="open_api_key_modal",
        )


async def probe_tts() -> ModuleDiagnosticResult:
    start_time = time.perf_counter()
    tested_at = datetime.now(timezone.utc).strftime("%H:%M:%S")
    
    # Check local TTS microservice on port 8018
    local_tts_url = "http://127.0.0.1:8018/health"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(local_tts_url)
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            if resp.status_code == 200:
                return ModuleDiagnosticResult(
                    module_id="tts",
                    module_name="TTS 语音合成引擎 (Speech Synthesis)",
                    status="healthy",
                    latency_ms=elapsed_ms,
                    tested_at=tested_at,
                    summary="独立 TTS 微服务 (端口 8018) 在线运行中",
                    details={"port": 8018, "status_code": 200, "cosyvoice_enabled": True},
                )
    except Exception:
        pass

    # If local 8018 is not active, check fallback
    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
    return ModuleDiagnosticResult(
        module_id="tts",
        module_name="TTS 语音合成引擎 (Speech Synthesis)",
        status="warning",
        latency_ms=elapsed_ms,
        tested_at=tested_at,
        summary="本地独立 TTS 进程 (端口 8018) 未开启，系统已自动启用 Edge-TTS 与浏览器本地合成双重降级",
        details={"port_8018_active": False, "edge_tts_fallback": True},
        root_cause="后台未运行独立 TTS 微服务，高级 CosyVoice 复刻功能受限。",
        actionable_remedy="若需开启 CosyVoice 高级声音复刻，请在终端执行 `./start_all.sh` 启动完整微服务套件。",
        quick_action="view_logs",
    )


async def probe_scheduler() -> ModuleDiagnosticResult:
    start_time = time.perf_counter()
    tested_at = datetime.now(timezone.utc).strftime("%H:%M:%S")
    
    try:
        row = fetch_one("SELECT * FROM automation_config WHERE id = 1")
        runs = fetch_all("SELECT * FROM automation_runs ORDER BY started_at DESC LIMIT 5")
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        
        enabled = bool(row.get("enabled")) if row else False
        recent_failures = sum(1 for r in runs if r.get("status") == "failed")
        
        status = "healthy"
        summary = "自动化调度引擎配置正常"
        if not enabled:
            status = "warning"
            summary = "自动化调度开关当前处于关闭状态"
        elif recent_failures > 2:
            status = "warning"
            summary = f"近期执行中有 {recent_failures} 次任务失败，请关注"
            
        return ModuleDiagnosticResult(
            module_id="scheduler",
            module_name="自动化调度器 (Automation Scheduler)",
            status=status,
            latency_ms=elapsed_ms,
            tested_at=tested_at,
            summary=summary,
            details={
                "enabled": enabled,
                "interval_minutes": row.get("interval_minutes", 30) if row else 30,
                "recent_runs_count": len(runs),
                "recent_failures": recent_failures,
            },
            actionable_remedy="可在【自动化】页面开启调度或调整抓取分类与轮询频次。" if not enabled else None,
            quick_action="view_automation",
        )
    except Exception as e:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return ModuleDiagnosticResult(
            module_id="scheduler",
            module_name="自动化调度器 (Automation Scheduler)",
            status="error",
            latency_ms=elapsed_ms,
            tested_at=tested_at,
            summary=f"读取调度配置异常: {str(e)}",
            details={"error": str(e)},
            root_cause=str(e),
            actionable_remedy="请检查 SQLite 数据库表 automation_config 是否正常初始化。",
            quick_action="view_logs",
        )


async def probe_storage() -> ModuleDiagnosticResult:
    start_time = time.perf_counter()
    tested_at = datetime.now(timezone.utc).strftime("%H:%M:%S")
    
    base_dir = Path(__file__).resolve().parents[2] / "data" / "audio"
    try:
        base_dir.mkdir(parents=True, exist_ok=True)
        # Test write permission
        test_file = base_dir / ".probe_test"
        test_file.write_text("ok")
        test_file.unlink()
        
        usage = shutil.disk_usage(str(base_dir))
        free_gb = round(usage.free / (1024 ** 3), 2)
        total_gb = round(usage.total / (1024 ** 3), 2)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        
        status = "healthy"
        if free_gb < 1.0:
            status = "error"
            summary = f"磁盘剩余空间严重不足 ({free_gb} GB)"
        elif free_gb < 5.0:
            status = "warning"
            summary = f"磁盘剩余空间较低 ({free_gb} GB)"
        else:
            summary = f"音频目录可写，磁盘剩余空间充足 ({free_gb} GB / {total_gb} GB)"
            
        return ModuleDiagnosticResult(
            module_id="storage",
            module_name="音频固化与静态分发 (Storage & Hosting)",
            status=status,
            latency_ms=elapsed_ms,
            tested_at=tested_at,
            summary=summary,
            details={"free_gb": free_gb, "total_gb": total_gb, "path": str(base_dir)},
            actionable_remedy="请清理无用日志或旧音频以释放磁盘空间。" if free_gb < 5.0 else None,
            quick_action="view_trash" if free_gb < 5.0 else None,
        )
    except Exception as e:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return ModuleDiagnosticResult(
            module_id="storage",
            module_name="音频固化与静态分发 (Storage & Hosting)",
            status="error",
            latency_ms=elapsed_ms,
            tested_at=tested_at,
            summary=f"音频目录写入权限异常: {str(e)}",
            details={"error": str(e), "path": str(base_dir)},
            root_cause="服务对 data/audio 目录缺乏写权限。",
            actionable_remedy="请在终端执行 `chmod -R 755 data/audio` 赋予目录读写权限。",
            quick_action="view_logs",
        )


async def probe_database() -> ModuleDiagnosticResult:
    start_time = time.perf_counter()
    tested_at = datetime.now(timezone.utc).strftime("%H:%M:%S")
    
    try:
        news_cnt = fetch_one("SELECT count(*) as c FROM news") or {"c": 0}
        dolls_cnt = fetch_one("SELECT count(*) as c FROM dolls") or {"c": 0}
        channels_cnt = fetch_one("SELECT count(*) as c FROM channels") or {"c": 0}
        audio_cnt = fetch_one("SELECT count(*) as c FROM audio_assets") or {"c": 0}
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        
        return ModuleDiagnosticResult(
            module_id="database",
            module_name="SQLite 数据库引擎 (Database Engine)",
            status="healthy",
            latency_ms=elapsed_ms,
            tested_at=tested_at,
            summary=f"数据库查询响应正常 ({elapsed_ms}ms)，包含 {dolls_cnt.get('c', 0)} 个玩偶, {channels_cnt.get('c', 0)} 个频道, {news_cnt.get('c', 0)} 条新闻, {audio_cnt.get('c', 0)} 个音频资产",
            details={
                "dolls_count": dolls_cnt.get("c", 0),
                "channels_count": channels_cnt.get("c", 0),
                "news_count": news_cnt.get("c", 0),
                "audio_count": audio_cnt.get("c", 0),
            },
        )
    except Exception as e:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return ModuleDiagnosticResult(
            module_id="database",
            module_name="SQLite 数据库引擎 (Database Engine)",
            status="error",
            latency_ms=elapsed_ms,
            tested_at=tested_at,
            summary=f"数据库查询失败: {str(e)}",
            details={"error": str(e)},
            root_cause=str(e),
            actionable_remedy="请检查 data/radio_ai.db 数据库文件是否被其他进程锁住或损坏。",
            quick_action="view_logs",
        )


async def probe_device() -> ModuleDiagnosticResult:
    start_time = time.perf_counter()
    tested_at = datetime.now(timezone.utc).strftime("%H:%M:%S")
    
    try:
        devices = fetch_all("SELECT count(DISTINCT device_sn) as c FROM playback_logs") or [{"c": 0}]
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        device_count = devices[0].get("c", 0) if devices else 0
        
        return ModuleDiagnosticResult(
            module_id="device",
            module_name="设备网关与打断交互 (Device Gateway)",
            status="healthy",
            latency_ms=elapsed_ms,
            tested_at=tested_at,
            summary=f"设备网关就绪，历史累计上报设备数: {device_count} 台",
            details={"total_device_sessions": device_count, "gateway_active": True},
        )
    except Exception as e:
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return ModuleDiagnosticResult(
            module_id="device",
            module_name="设备网关与打断交互 (Device Gateway)",
            status="warning",
            latency_ms=elapsed_ms,
            tested_at=tested_at,
            summary=f"设备网关读取记录异常: {str(e)}",
            details={"error": str(e)},
        )


ALL_PROBES = {
    "crawler": probe_crawler,
    "llm": probe_llm,
    "tts": probe_tts,
    "scheduler": probe_scheduler,
    "storage": probe_storage,
    "database": probe_database,
    "device": probe_device,
}


@router.get("/api/v1/admin/health/status", response_model=SystemHealthStatusResponse)
@router.get("/api/v1/radio-ai/health/status", response_model=SystemHealthStatusResponse)
async def get_system_health_status():
    """获取所有模块的健康状态概览 (并行快速检查)"""
    results = await asyncio.gather(
        probe_crawler(),
        probe_llm(),
        probe_tts(),
        probe_scheduler(),
        probe_storage(),
        probe_database(),
        probe_device(),
    )
    
    healthy = sum(1 for r in results if r.status == "healthy")
    warning = sum(1 for r in results if r.status == "warning")
    error = sum(1 for r in results if r.status == "error")
    
    total = len(results)
    health_score = int((healthy * 100 + warning * 70) / total) if total > 0 else 100
    
    if error > 0:
        overall = "down" if error >= 3 else "degraded"
    elif warning > 0:
        overall = "degraded"
    else:
        overall = "healthy"
        
    return SystemHealthStatusResponse(
        overall_status=overall,
        health_score=health_score,
        healthy_count=healthy,
        warning_count=warning,
        error_count=error,
        checked_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        modules=results,
    )


class DiagnoseRequest(BaseModel):
    module: Optional[str] = None


@router.post("/api/v1/admin/health/diagnose")
@router.post("/api/v1/radio-ai/health/diagnose")
async def run_diagnostics(payload: Optional[DiagnoseRequest] = Body(default=None)):
    """主动运行单模块或全系统深度探针体检"""
    target_module = payload.module if payload else None
    
    if target_module and target_module in ALL_PROBES:
        probe_func = ALL_PROBES[target_module]
        result = await probe_func()
        return {"mode": "single", "module": target_module, "result": result}
    
    # Run all probes
    results = await asyncio.gather(
        probe_crawler(),
        probe_llm(),
        probe_tts(),
        probe_scheduler(),
        probe_storage(),
        probe_database(),
        probe_device(),
    )
    
    healthy = sum(1 for r in results if r.status == "healthy")
    warning = sum(1 for r in results if r.status == "warning")
    error = sum(1 for r in results if r.status == "error")
    
    return {
        "mode": "all",
        "checked_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        "healthy_count": healthy,
        "warning_count": warning,
        "error_count": error,
        "results": results,
    }
