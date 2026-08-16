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
        with httpx.Client(timeout=3) as client:
            client.put(f"{BACKEND_URL}/api/v1/internal/news/{news_id}/audio/status", json={"status": "generating"})
    except Exception:
        pass
        
    try:
        output_stem = Path(output_stem_str)
        path, duration, size = asyncio.run(
            synthesize(text, voice_id, output_stem, tts_provider)
        )
        
        # Notify backend of success
        notified = False
        try:
            with httpx.Client(timeout=3) as client:
                res = client.put(f"{BACKEND_URL}/api/v1/internal/news/{news_id}/audio", json={
                    "audio_path": str(path),
                    "audio_duration_seconds": duration,
                    "audio_size_bytes": size,
                    "voice_id": voice_id,
                    "tts_provider": tts_provider or "edge"
                })
                if res.status_code == 200:
                    notified = True
        except Exception:
            pass

        if not notified:
            try:
                from radio_ai_data import execute, utc_now
                execute(
                    "UPDATE news SET audio_status='ready', audio_path=?, audio_duration_seconds=?, audio_size_bytes=?, voice_id=?, tts_provider=?, updated_at=? WHERE id=?",
                    (str(path), duration, size, voice_id, tts_provider or "edge", utc_now(), news_id),
                )
            except Exception:
                pass
            
        return {"status": "ok", "path": str(path)}
    except Exception as exc:
        try:
            with httpx.Client(timeout=3) as client:
                client.put(f"{BACKEND_URL}/api/v1/internal/news/{news_id}/audio/status", json={
                    "status": "failed",
                    "failure_stage": "audio",
                    "failure_message": str(exc)[:2000]
                })
        except Exception:
            try:
                from radio_ai_data import execute, utc_now
                execute(
                    "UPDATE news SET audio_status=?, failure_stage=?, failure_message=?, updated_at=? WHERE id=?",
                    ("failed", "audio", str(exc)[:2000], utc_now(), news_id),
                )
            except Exception:
                pass
        return {"status": "error", "error": str(exc)}
