import asyncio
from pathlib import Path
import httpx
import os
from .celery_app import celery_app
from .synthesizer import synthesize

BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")

@celery_app.task(name="tts.synthesize_audio", bind=True)
def synthesize_audio(self, news_id: str, text: str, voice_id: str, output_stem_str: str, tts_provider: str | None = None) -> dict:
    try:
        # Notify backend that generation started
        with httpx.Client() as client:
            client.put(f"{BACKEND_URL}/api/v1/internal/news/{news_id}/audio/status", json={"status": "generating"})
            
        output_stem = Path(output_stem_str)
        loop = asyncio.get_event_loop()
        path, duration, size = loop.run_until_complete(
            synthesize(text, voice_id, output_stem, tts_provider)
        )
        
        # Notify backend of success
        with httpx.Client() as client:
            client.put(f"{BACKEND_URL}/api/v1/internal/news/{news_id}/audio", json={
                "audio_path": str(path),
                "audio_duration_seconds": duration,
                "audio_size_bytes": size,
                "voice_id": voice_id,
                "tts_provider": tts_provider or "edge"
            })
            
        return {"status": "ok", "path": str(path)}
    except Exception as exc:
        with httpx.Client() as client:
            client.put(f"{BACKEND_URL}/api/v1/internal/news/{news_id}/audio/status", json={
                "status": "failed",
                "failure_stage": "audio",
                "failure_message": str(exc)[:2000]
            })
        return {"status": "error", "error": str(exc)}
