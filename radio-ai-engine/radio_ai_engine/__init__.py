from .client import SYSTEM_PROMPT, get_dashscope_api_key, generate_script
from .persona import generate_draft_news, generate_channel_copy

__all__ = [
    "SYSTEM_PROMPT",
    "get_dashscope_api_key",
    "generate_script",
    "generate_draft_news",
    "generate_channel_copy",
]
