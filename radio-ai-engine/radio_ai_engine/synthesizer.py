from __future__ import annotations

import asyncio
import math
import os
from pathlib import Path
import struct
import wave

from .client import get_dashscope_api_key

DEFAULT_VOICE = os.getenv("RADIO_AI_DEFAULT_VOICE", "zh-CN-XiaoxiaoNeural")
BAILIAN_DEFAULT_VOICE = os.getenv("BAILIAN_DEFAULT_VOICE", "longanya_v3")
BAILIAN_TTS_MODEL = os.getenv("BAILIAN_TTS_MODEL", "cosyvoice-v3-flash")


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

    voice = (voice_id or DEFAULT_VOICE).strip()

    if tts_provider:
        provider = tts_provider.strip().lower()
    elif voice.startswith("zh-") and "Neural" in voice:
        provider = "edge"
    elif voice.startswith("cosyvoice") or voice.endswith("_v3") or "lotso" in voice or "xiaoxin" in voice or "wanzi" in voice or "hudi" in voice:
        provider = "bailian"
    else:
        provider = os.getenv("RADIO_AI_TTS_PROVIDER", "edge").strip().lower()

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
        edge_voice = voice if voice.startswith("zh-") else DEFAULT_VOICE
        await edge_tts.Communicate(text=text, voice=edge_voice).save(str(path))
    elif provider in ("bailian", "cosyvoice"):
        effective_key = get_dashscope_api_key(api_key)
        if not effective_key:
            raise RuntimeError("阿里百炼语音生成需要 DASHSCOPE_API_KEY，请配置百炼 API Key (sk-...)")
        try:
            import dashscope
            from dashscope.audio.tts_v2 import SpeechSynthesizer
        except ImportError as exc:
            raise RuntimeError("请安装 dashscope 后再使用百炼语音") from exc
        path = output_stem.with_suffix(".mp3")
        dashscope.api_key = effective_key
        bailian_voice = BAILIAN_DEFAULT_VOICE if voice.startswith("zh-") else voice

        target_model = BAILIAN_TTS_MODEL
        if bailian_voice.startswith("cosyvoice-v3.5-plus"):
            target_model = "cosyvoice-v3.5-plus"
        elif bailian_voice.startswith("cosyvoice-v3.5-turbo"):
            target_model = "cosyvoice-v3.5-turbo"
        elif bailian_voice.startswith("cosyvoice-v1"):
            target_model = "cosyvoice-v1"

        synthesizer = SpeechSynthesizer(model=target_model, voice=bailian_voice)
        data = await asyncio.to_thread(synthesizer.call, text)
        if not data or len(data) < 100:
            raise RuntimeError(f"百炼未返回有效音频 (模型: {target_model}, 发音人: {bailian_voice})")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    else:
        raise ValueError(f"不支持的 TTS Provider：{provider}")

    return path, max(1, round(len(text) / 4)), path.stat().st_size
