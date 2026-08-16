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
        raise HTTPException(status_code=409, detail="配置已被其他操作修改，请刷新")
    clean_tags = {normalize_tag(tag): max(0, min(20, int(count))) for tag, count in request.tags.items()}
    if not 1 <= sum(clean_tags.values()) <= 27:
        raise HTTPException(status_code=422, detail="单轮抓取总数必须为 1 到 27")
    execute(
        "UPDATE automation_config SET tags_json=?, doll_id=?, interval_minutes=?, version=version+1, updated_at=? WHERE id=1",
        (json.dumps(clean_tags), request.doll_id, request.interval_minutes, utc_now()),
    )
    return automation_config()


def update_automation_state_handler(request: AutomationStateUpdate) -> dict[str, Any]:
    current = automation_config()
    if request.expected_version != current["version"]:
        raise HTTPException(status_code=409, detail="配置已被其他操作修改，请刷新")
    execute("UPDATE automation_config SET enabled=?, version=version+1, updated_at=? WHERE id=1", (int(request.enabled), utc_now()))
    return automation_config()


def get_automation_runs_handler(page: int = 1, page_size: int = 20) -> dict[str, Any]:
    total = fetch_one("SELECT COUNT(*) AS count FROM automation_runs")["count"]
    rows = fetch_all("SELECT * FROM automation_runs ORDER BY started_at DESC LIMIT ? OFFSET ?", (page_size, (page - 1) * page_size))
    items = [
        {
            "run_id": row["run_id"],
            "trigger": row["trigger"],
            "status": row["status"],
            "started_at": row["started_at"],
            "finished_at": row["finished_at"],
            "statistics": json.loads(row["statistics_json"] or "{}"),
            "failure_summary": json.loads(row["failure_json"]) if row["failure_json"] else None,
        }
        for row in rows
    ]
    return {"page": page, "page_size": page_size, "total": total, "items": items}


async def run_manual_automation(request: AutomationRunRequest) -> dict[str, Any]:
    run_id, started_at = str(uuid4()), utc_now()
    execute("INSERT INTO automation_runs(run_id,trigger,status,started_at) VALUES (?,'manual','running',?)", (run_id, started_at))
    results: dict[str, Any] = {}
    failures: dict[str, str] = {}
    for tag, count in request.tags.items():
        if count < 1:
            continue
        try:
            results[tag] = await run_pipeline(PipelineRequest(tag=tag, limit=min(count, 20), generate_audio=True))
        except Exception as exc:
            failures[tag] = str(exc)
    status = "failed" if failures and not results else "partial" if failures else "success"
    execute(
        "UPDATE automation_runs SET status=?, finished_at=?, statistics_json=?, failure_json=? WHERE run_id=?",
        (status, utc_now(), json.dumps(results, ensure_ascii=False), json.dumps(failures, ensure_ascii=False) if failures else None, run_id),
    )
    return {"run_id": run_id, "status": status, "statistics": results, "failures": failures}
