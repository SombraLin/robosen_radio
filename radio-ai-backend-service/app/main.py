from __future__ import annotations

from app.main_service import create_app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    from app.config import settings

    uvicorn.run("app.main:app", host="127.0.0.1", port=settings.port, reload=True)
