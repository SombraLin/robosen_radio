import asyncio
import logging
from pathlib import Path
import os
import time
from typing import Any
import httpx
from .celery_app import celery_app
from .synthesizer import synthesize

logger = logging.getLogger(__name__)

BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")
INTERNAL_API_SECRET = os.getenv("INTERNAL_API_SECRET", "radio-ai-internal-secret-token")


def _send_internal_callback(url: str, payload: dict[str, Any]) -> bool:
    headers = {"X-Internal-Secret": INTERNAL_API_SECRET}
    for attempt in range(3):
        try:
            with httpx.Client(timeout=5) as client:
                res = client.put(url, json=payload, headers=headers)
                if res.status_code == 200:
                    return True
                logger.warning(f"Internal callback non-200 status={res.status_code} attempt={attempt+1} url={url}")
        except Exception as e:
            if attempt == 2:
                logger.error(f"Failed internal callback attempt={attempt+1} url={url}: {e}", exc_info=True)
            time.sleep(0.5 * (2 ** attempt))
    return False


@celery_app.task(name="tts.synthesize_audio", bind=True)
def synthesize_audio(
    self, 
    news_id: str, 
    text: str, 
    voice_id: str, 
    output_stem_str: str, 
    tts_provider: str | None = None
) -> dict[str, Any]:
    _send_internal_callback(
        f"{BACKEND_URL}/api/v1/internal/news/{news_id}/audio/status",
        {"status": "generating"},
    )
        
    try:
        output_stem = Path(output_stem_str)
        path, duration, size = asyncio.run(
            synthesize(text, voice_id, output_stem, tts_provider)
        )
        
        # Notify backend of success with retries
        success = _send_internal_callback(
            f"{BACKEND_URL}/api/v1/internal/news/{news_id}/audio",
            {
                "audio_path": str(path),
                "audio_duration_seconds": duration,
                "audio_size_bytes": size,
                "voice_id": voice_id,
                "tts_provider": tts_provider or "edge",
            },
        )
        if not success:
            logger.error(f"Final audio callback failure for news_id={news_id}")
            
        return {"status": "ok", "path": str(path)}
    except Exception as exc:
        logger.error(f"TTS synthesis task failed for news_id={news_id}: {exc}", exc_info=True)
        _send_internal_callback(
            f"{BACKEND_URL}/api/v1/internal/news/{news_id}/audio/status",
            {
                "status": "failed",
                "failure_stage": "audio",
                "failure_message": str(exc)[:2000],
            },
        )
        return {"status": "error", "error": str(exc)}
