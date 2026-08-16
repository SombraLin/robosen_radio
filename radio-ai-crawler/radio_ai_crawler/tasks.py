import asyncio
import httpx
import os
from datetime import datetime, timezone
from typing import Any

from .celery_app import celery_app

# The engine package contains the DashScope LLM logic.
# Wait! In the decoupled architecture, radio-ai-crawler has the LLM logic?
# Yes, or it can call a separate service. But for simplicity, we import it here.
# Let's dynamically add radio-ai-engine to sys.path if not installed.
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
    llm_provider: str | None = None
) -> dict[str, Any]:
    
    # Notify backend that generation started
    with httpx.Client() as client:
        client.put(f"{BACKEND_URL}/api/v1/internal/news/{news_id}/script/status", json={"status": "generating"})
        
    try:
        dt = datetime.fromisoformat(published_at) if published_at else None
        
        loop = asyncio.get_event_loop()
        text = loop.run_until_complete(generate_script(
            title, source, clean_summary, dt,
            custom_prompt=custom_prompt,
            llm_model=llm_model,
            llm_provider=llm_provider
        ))
        
        # Notify backend of success
        with httpx.Client() as client:
            client.put(f"{BACKEND_URL}/api/v1/internal/news/{news_id}/script", json={
                "script_text": text,
                "custom_prompt": custom_prompt,
                "llm_model": llm_model
            })
            
        return {"status": "ok", "news_id": news_id}
    except Exception as exc:
        with httpx.Client() as client:
            client.put(f"{BACKEND_URL}/api/v1/internal/news/{news_id}/script/status", json={
                "status": "failed",
                "failure_stage": "script",
                "failure_message": str(exc)[:2000]
            })
        return {"status": "error", "error": str(exc)}
