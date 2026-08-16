import asyncio
import logging
import os
import time
from typing import Any
import httpx

from .celery_app import celery_app

try:
    from radio_ai_engine.client import generate_script
except ImportError:
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parents[3] / "radio-ai-engine"))
    from radio_ai_engine.client import generate_script

try:
    from radio_ai_data import get_generative_config
except ImportError:
    import sys
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parents[3] / "radio-ai-data"))
    from radio_ai_data import get_generative_config

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
) -> dict[str, Any]:
    _send_internal_callback(
        f"{BACKEND_URL}/api/v1/internal/news/{news_id}/script/status",
        {"status": "generating"},
    )
        
    try:
        # Worker reads API key internally from DB configuration
        gen_cfg = get_generative_config()
        effective_key = gen_cfg.get("dashscope_api_key") or os.getenv("DASHSCOPE_API_KEY")

        text = asyncio.run(generate_script(
            title, source, clean_summary, str(published_at) if published_at else None,
            custom_prompt=custom_prompt,
            llm_model=llm_model,
            llm_provider=llm_provider,
            api_key=effective_key,
        ))
        
        # Notify backend of success with retries
        success = _send_internal_callback(
            f"{BACKEND_URL}/api/v1/internal/news/{news_id}/script",
            {
                "script_text": text,
                "custom_prompt": custom_prompt,
                "llm_model": llm_model,
            },
        )
        if not success:
            logger.error(f"Final callback failure for news_id={news_id}")
            
        return {"status": "ok", "news_id": news_id, "script_text": text}
    except Exception as exc:
        logger.error(f"Script generation failed for news_id={news_id}: {exc}", exc_info=True)
        _send_internal_callback(
            f"{BACKEND_URL}/api/v1/internal/news/{news_id}/script/status",
            {
                "status": "failed",
                "failure_stage": "script",
                "failure_message": str(exc)[:2000],
            },
        )
        return {"status": "error", "error": str(exc)}
