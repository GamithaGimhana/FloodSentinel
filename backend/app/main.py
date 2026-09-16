import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.weather import router as weather_router
from app.api.v1.predict_routes import router as predict_router
from app.services.weather_service import weather_service
from app.services.radar_service import radar_service
from app.services.ml_service import ml_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("floodsentinel.weather")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager: pre-warms radar and default weather caches on boot."""
    import httpx
    async with httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT_SECONDS) as client:
        weather_service.client = client
        radar_service.client = client
        ml_service.load_pipeline()
        try:
            yield
        finally:
            weather_service.client = None
            radar_service.client = None



app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Academic meteorological and flood-risk demonstration service for **FloodSentinel Sri Lanka**.\n\n"
        "Directly interfaces with **Open-Meteo Weather API** and **RainViewer Radar API** to supply real-time "
        "rainfall intensity, 7-day cumulative precipitations, topsoil saturation, and radar overlays without requiring API keys."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


from fastapi.responses import RedirectResponse


@app.get(
    "/",
    include_in_schema=False,
    summary="Root Endpoint",
    description="Redirects to interactive Swagger API documentation."
)
async def root():
    return RedirectResponse(url="/docs")


@app.get(
    "/health",
    tags=["System"],
    summary="Service Health Check",
    description="Returns the current operational status, uptime, and service version."
)
async def health_check():
    return {
        "status": "ready" if ml_service.model_type == "pipeline" else "demo",
        "model_available": ml_service.model_type == "pipeline",
        "data_sources": {"weather": "Open-Meteo", "radar": "RainViewer"},
        "notice": "Academic prototype. Heuristic scores are not calibrated probabilities or official warnings.",
        "service": "FloodSentinel Weather, Radar & ML Inference API",
        "version": settings.VERSION,
        "district_coverage": 25,
        "ml_model_type": ml_service.model_type,
        "default_coordinates": {
            "latitude": settings.DEFAULT_LATITUDE,
            "longitude": settings.DEFAULT_LONGITUDE
        }
    }


# Register API v1 routes
app.include_router(weather_router, prefix=settings.API_V1_STR, tags=["Meteorology & Radar"])
app.include_router(predict_router, prefix=settings.API_V1_STR, tags=["ML Prediction & Simulation"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)


# A per-process safety limit; deploy a shared gateway limit when using multiple workers.
from collections import deque
from time import monotonic
from cachetools import TTLCache
from fastapi.responses import JSONResponse
_request_windows = TTLCache(maxsize=4096, ttl=60)

@app.middleware("http")
async def limit_api_requests(request, call_next):
    if request.url.path.startswith("/api/"):
        key = request.client.host if request.client else "unknown"
        now = monotonic()
        window = _request_windows.setdefault(key, deque())
        while window and window[0] <= now - 60:
            window.popleft()
        if len(window) >= 120:
            return JSONResponse({"detail": "Too many requests; retry in a minute."}, 429, headers={"Retry-After": "60"})
        window.append(now)
    return await call_next(request)
