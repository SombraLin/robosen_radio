from __future__ import annotations

from typing import Any
from .client import generate_script


async def generate_draft_news(topic: str, category: str = "科技", channel_role: str = "默认新闻") -> dict[str, Any]:
    content = await generate_script(
        topic,
        channel_role,
        f"围绕{topic}生成一条{category}类简讯",
        None,
    )
    return {
        "title": topic[:80],
        "content": content,
        "duration_seconds": max(20, round(len(content) / 4)),
    }


def generate_channel_copy(doll_name: str, style_keyword: str = "温暖自然") -> dict[str, str]:
    return {
        "prompt": f"{style_keyword}风格的频道主持人",
        "intro": f"大家好，我是{doll_name}，欢迎收听我的频道。",
        "outro": "感谢收听，我们下期再见。",
    }
