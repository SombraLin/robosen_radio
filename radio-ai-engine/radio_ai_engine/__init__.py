from .client import SYSTEM_PROMPT, get_dashscope_api_key, generate_script
from .persona import generate_draft_news, generate_channel_copy
from .synthesizer import synthesize, write_demo_wav

__all__ = [
    "SYSTEM_PROMPT",
    "get_dashscope_api_key",
    "generate_script",
    "generate_draft_news",
    "generate_channel_copy",
    "synthesize",
    "write_demo_wav",
]
