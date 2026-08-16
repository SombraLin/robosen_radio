from datetime import datetime, timedelta, timezone
import pytest

from radio_ai_crawler.zaker_fetcher import (
    Candidate,
    normalize_tag,
    parse_publish_time,
    clean_summary,
    validate_candidate,
)


def test_normalize_tag():
    # Valid tags
    assert normalize_tag("hot") == "hot"
    assert normalize_tag("entertainment") == "entertainment"
    assert normalize_tag("tech") == "tech"

    # Aliases
    assert normalize_tag("sport") == "sports"
    assert normalize_tag("technology") == "tech"
    assert normalize_tag("automotive") == "auto"
    assert normalize_tag("domestic") == "china"
    assert normalize_tag("international") == "world"

    # Formatting
    assert normalize_tag("  SPORTS  ") == "sports"
    assert normalize_tag("China") == "china"

    # Invalid tags
    with pytest.raises(ValueError):
        normalize_tag("unknown_tag_xyz")


def test_parse_publish_time():
    # None & bool
    assert parse_publish_time(None) is None
    assert parse_publish_time(True) is None
    assert parse_publish_time(False) is None

    # Unix timestamps (seconds & milliseconds)
    t_sec = 1700000000
    expected = datetime.fromtimestamp(t_sec, timezone.utc)
    assert parse_publish_time(t_sec) == expected
    assert parse_publish_time(t_sec * 1000) == expected
    assert parse_publish_time(str(t_sec)) == expected

    # ISO 8601 strings
    iso_z = "2026-08-16T12:00:00Z"
    assert parse_publish_time(iso_z) == datetime(2026, 8, 16, 12, 0, 0, tzinfo=timezone.utc)

    iso_tz = "2026-08-16T20:00:00+08:00"
    assert parse_publish_time(iso_tz) == datetime(2026, 8, 16, 12, 0, 0, tzinfo=timezone.utc)

    # Standard date string formats (assumed Asia/Shanghai +08:00)
    std_str = "2026-08-16 20:00:00"
    assert parse_publish_time(std_str) == datetime(2026, 8, 16, 12, 0, 0, tzinfo=timezone.utc)

    # Invalid strings
    assert parse_publish_time("not-a-date") is None
    assert parse_publish_time("") is None


def test_clean_summary():
    # HTML tags removal and unescape
    raw = "<p>这是一段包含 &amp; &lt;b&gt;HTML&lt;/b&gt; 标签的<b>测试摘要</b>。</p>"
    cleaned = clean_summary(raw)
    assert cleaned == "这是一段包含 & HTML 标签的 测试摘要 。"

    # Whitespace and NFKC normalization
    raw_ws = "  多重   \n\t 空格与　全角字符 １２３  "
    cleaned_ws = clean_summary(raw_ws)
    assert cleaned_ws == "多重 空格与 全角字符 123"

    # Empty
    assert clean_summary("") == ""
    assert clean_summary(None) == ""


def test_validate_candidate():
    now = datetime(2026, 8, 16, 12, 0, 0, tzinfo=timezone.utc)
    valid_pub = now - timedelta(hours=2)
    raw_summary = "这是一段非常标准的新闻摘要内容，其有效字数完全满足系统设定的三十个字以上的门槛要求并且语言完整清晰。"
    valid_summary = clean_summary(raw_summary)

    valid_cand = Candidate(
        title="科技前沿：AI新模型发布",
        source="科技日报",
        url="https://example.com/news/123",
        published_at=valid_pub,
        raw_summary=raw_summary,
        clean_summary=valid_summary,
        tag="tech",
        language="zh-CN",
    )

    # 1. Valid case
    assert validate_candidate(valid_cand, now) is None

    # 2. Invalid title
    cand_no_title = Candidate(**{**valid_cand.__dict__, "title": ""})
    assert validate_candidate(cand_no_title, now) == "invalid_title"
    cand_long_title = Candidate(**{**valid_cand.__dict__, "title": "A" * 600})
    assert validate_candidate(cand_long_title, now) == "invalid_title"

    # 3. Invalid URL
    cand_bad_url = Candidate(**{**valid_cand.__dict__, "url": "ftp://bad-scheme"})
    assert validate_candidate(cand_bad_url, now) == "invalid_url"
    cand_no_host = Candidate(**{**valid_cand.__dict__, "url": "http://"})
    assert validate_candidate(cand_no_host, now) == "invalid_url"

    # 4. Invalid time
    cand_no_time = Candidate(**{**valid_cand.__dict__, "published_at": None})
    assert validate_candidate(cand_no_time, now) == "invalid_time"

    # 5. Future time (> 10 mins)
    cand_future = Candidate(**{**valid_cand.__dict__, "published_at": now + timedelta(minutes=20)})
    assert validate_candidate(cand_future, now) == "future_time"

    # 6. Too old (> 24 hours)
    cand_old = Candidate(**{**valid_cand.__dict__, "published_at": now - timedelta(hours=25)})
    assert validate_candidate(cand_old, now) == "too_old"

    # 7. Short / Invalid summary
    cand_short = Candidate(**{**valid_cand.__dict__, "clean_summary": "太短了"})
    assert validate_candidate(cand_short, now) == "invalid_summary"

    # 8. Summary equals title
    cand_eq = Candidate(**{**valid_cand.__dict__, "title": valid_summary, "clean_summary": valid_summary})
    assert validate_candidate(cand_eq, now) == "invalid_summary"
