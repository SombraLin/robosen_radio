from .routes import router as device_router
from .theater_ws import router as theater_ws_router

__all__ = ["device_router", "theater_ws_router"]
