import asyncio
import httpx
import os
from typing import Any

from .celery_app import celery_app

try:
    from radio_ai_engine.client import generate_script
except ImportError:
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parents[3] / "radio-ai-engine"))
    from radio_ai_engine.client import generate_script

BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")


@celery_app.task(name="crawler.generate_script", bind=True)
def generate_script_task(
    self, 
    news_id: str, 
    title: str, 
    source: str, 
    clean_summary: str, 
    published_at: str | None,
    custom_prompt: str | None = None,
    llm_model: str | None = None,
    llm_provider: str | None = None,
    api_key: str | None = None,
) -> dict[str, Any]:
    try:
        with httpx.Client(timeout=3) as client:
            client.put(f"{BACKEND_URL}/api/v1/internal/news/{news_id}/script/status", json={"status": "generating"})
    except Exception:
        pass
        
    try:
        text = asyncio.run(generate_script(
            title, source, clean_summary, str(published_at) if published_at else None,
            custom_prompt=custom_prompt,
            llm_model=llm_model,
            llm_provider=llm_provider,
            api_key=api_key
        ))
        
        # Notify backend of success
        notified = False
        try:
            with httpx.Client(timeout=3) as client:
                res = client.put(f"{BACKEND_URL}/api/v1/internal/news/{news_id}/script", json={
                    "script_text": text,
                    "custom_prompt": custom_prompt,
                    "llm_model": llm_model
                })
                if res.status_code == 200:
                    notified = True
        except Exception:
            pass

        if not notified:
            try:
                from radio_ai_data import execute, utc_now
                execute(
                    "UPDATE news SET script_text=?, custom_prompt=?, llm_model=?, script_status='ready', audio_status=CASE WHEN audio_path IS NULL THEN 'missing' ELSE 'stale' END, updated_at=? WHERE id=?",
                    (text, custom_prompt, llm_model, utc_now(), news_id),
                )
            except Exception:
                pass
            
        return {"status": "ok", "news_id": news_id, "script_text": text}
    except Exception as exc:
        try:
            with httpx.Client(timeout=3) as client:
                client.put(f"{BACKEND_URL}/api/v1/internal/news/{news_id}/script/status", json={
                    "status": "failed",
                    "failure_stage": "script",
                    "failure_message": str(exc)[:2000]
                })
        except Exception:
            try:
                from radio_ai_data import execute, utc_now
                execute(
                    "UPDATE news SET script_status='failed', failure_stage='script', failure_message=?, updated_at=? WHERE id=?",
                    (str(exc)[:2000], utc_now(), news_id),
                )
            except Exception:
                pass
        return {"status": "error", "error": str(exc)}
