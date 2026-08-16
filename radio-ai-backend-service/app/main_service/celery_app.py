import os
from celery import Celery

redis_url = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")

celery_app = Celery(
    "backend_client",
    broker=redis_url,
    backend=redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Shanghai",
    enable_utc=True,
    task_routes={
        "crawler.*": {"queue": "crawler_queue"},
        "tts.*": {"queue": "tts_queue"},
    }
)
