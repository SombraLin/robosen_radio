from __future__ import annotations

import asyncio
import logging
import math
from pathlib import Path
import struct
import wave

from app.config import settings

logger = logging.getLogger(__name__)


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
                logger.warning(f"阿里百炼 CosyVoice 生成异常 ({err})，自动降级为 Edge-TTS 免费音色...", exc_info=True)

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

    return path, max(1, round(len(text) / 4)), path.stat().st_size
