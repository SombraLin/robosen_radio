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
    if isinstance(value, (int, float)) or str(value).replace(".", "", 1).isdigit():
        stamp = float(value)
        if stamp > 10_000_000_000:
            stamp /= 1000
        try:
            return datetime.fromtimestamp(stamp, timezone.utc)
        except (ValueError, OSError, OverflowError):
            return None
    text = str(value).strip()
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
    if candidate.published_at > now + timedelta(minutes=10):
        return "future_time"
    if candidate.published_at < now - timedelta(hours=24):
        return "too_old"
    normalized_title = _WHITESPACE.sub(" ", unicodedata.normalize("NFKC", candidate.title)).strip().casefold()
    normalized_summary = candidate.clean_summary.casefold()
    if len(_EFFECTIVE_CHAR.findall(candidate.clean_summary)) < 30 or normalized_summary == normalized_title:
        return "invalid_summary"
    if normalized_summary.startswith(normalized_title) and len(_EFFECTIVE_CHAR.findall(normalized_summary[len(normalized_title):])) < 12:
        return "invalid_summary"
    return None


async def _get_with_retry(url: str, params: dict[str, str], timeout: float = FETCH_TIMEOUT_SECONDS) -> dict[str, object]:
    last: Exception | None = None
    async with httpx.AsyncClient(timeout=timeout, trust_env=False) as client:
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
    for item in items[:20]:
        if not isinstance(item, dict):
            stats["invalid_item"] = stats.get("invalid_item", 0) + 1
            continue
        title, item_url = item.get("title"), item.get("url")
        if not isinstance(title, str) or not isinstance(item_url, str):
            stats["invalid_item"] = stats.get("invalid_item", 0) + 1
            continue
        summary = item.get("summary") if isinstance(item.get("summary"), str) else ""
        candidate = Candidate(title.strip(), str(item.get("author") or "ZAKER").strip(), item_url.strip(), parse_publish_time(item.get("publish_time")), summary, clean_summary(summary), tag, language)
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
