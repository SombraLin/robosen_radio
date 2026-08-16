from __future__ import annotations

import json
import os
import httpx

SYSTEM_PROMPT = """你是一名专业的新闻播报稿编辑。请把新闻素材改写成适合语音播报的中文短稿。要求：长度控制在80到150字；语言自然口语化；保留核心事实且不编造；不加入玩偶点评；不使用Markdown；只输出播报稿正文。"""


def get_dashscope_api_key(custom_key: str | None = None) -> str:
    if custom_key and custom_key.strip():
        return custom_key.strip()
    env_key = (os.getenv("DASHSCOPE_API_KEY") or os.getenv("BAILIAN_API_KEY") or "").strip()
    if env_key:
        return env_key
    try:
        from radio_ai_data import get_generative_config
        cfg = get_generative_config()
        return (cfg.get("dashscope_api_key") or "").strip()
    except Exception:
        return ""


async def generate_script(
    title: str,
    source: str,
    summary: str,
    published_at: str | None,
    custom_prompt: str | None = None,
    llm_model: str | None = None,
    llm_provider: str | None = None,
    api_key: str | None = None,
) -> str:
    provider = (llm_provider or os.getenv("RADIO_AI_LLM_PROVIDER", "bailian")).strip().lower()
    if provider == "local":
        prefix = f"这里是 RADIO AI 新闻快讯。{title}。据{source}消息，"
        suffix = "。以上是本条新闻的主要内容。"
        body = summary.strip().rstrip("。！？")
        budget = max(30, 150 - len(prefix) - len(suffix))
        if len(body) > budget:
            shortened = body[:budget]
            boundary = max(shortened.rfind(mark) for mark in ("。", "！", "？", "；", "，", ","))
            body = shortened[:boundary] if boundary >= budget // 2 else shortened
            body = body.rstrip("，,；; ")
        return f"{prefix}{body}{suffix}"

    if provider != "bailian":
        raise ValueError(f"不支持的 LLM：{provider}")

    effective_key = get_dashscope_api_key(api_key)
    if not effective_key:
        raise RuntimeError("阿里百炼稿件生成需要 DASHSCOPE_API_KEY，请配置百炼 API Key (sk-...)")

    prompt_content = (custom_prompt or "").strip() or SYSTEM_PROMPT
    target_model = (llm_model or os.getenv("BAILIAN_LLM_MODEL", "qwen-plus")).strip()

    payload = {
        "model": target_model,
        "messages": [
            {"role": "system", "content": prompt_content},
            {"role": "user", "content": f"标题：{title}\n来源：{source}\n摘要：{summary}\n发布时间：{published_at or '未知'}"},
        ],
        "temperature": 0.5,
        "max_tokens": 500,
    }
    headers = {"Authorization": f"Bearer {effective_key}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=60, trust_env=False) as client:
        response = await client.post("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
    try:
        content = data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(f"百炼返回格式异常：{json.dumps(data, ensure_ascii=False)[:500]}") from exc
    if not content:
        raise RuntimeError("百炼返回了空稿件")
    return content
