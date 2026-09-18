import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.weather import router as weather_router
from app.api.v1.predict_routes import router as predict_router
from app.services.weather_service import weather_service
from app.services.radar_service import radar_service
from app.services.ml_service import ml_service, ModelUnavailable

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
        "Meteorological monitoring and versioned flood scenario inference service for **FloodSentinel Sri Lanka**.\n\n"
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


import os
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, FileResponse

FRONTEND_DIST = os.getenv("FRONTEND_DIST", "")
if not FRONTEND_DIST:
    candidate_paths = [
        Path("/app/frontend_dist"),
        Path(__file__).resolve().parents[2] / "frontend_dist",
        Path(__file__).resolve().parents[2] / "frontend" / "dist",
    ]
    for p in candidate_paths:
        if p.is_dir() and (p / "index.html").is_file():
            FRONTEND_DIST = str(p)
            break


@app.get(
    "/",
    include_in_schema=False,
    summary="Root Endpoint",
    description="Serves the FloodSentinel dashboard or redirects to Swagger docs."
)
async def root():
    if FRONTEND_DIST:
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
    return RedirectResponse(url="/docs")


@app.get(
    "/health",
    tags=["System"],
    summary="Service Health Check",
    description="Returns the current operational status, uptime, and service version."
)
async def health_check():
    return {
        "status": "ready" if ml_service.model_type == "pipeline" else "degraded",
        "model_available": ml_service.model_type == "pipeline",
        "data_sources": {"weather": "Open-Meteo", "radar": "RainViewer"},
        "notice": "Synthetic-data research model; not an official warning or validated early forecast.",
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


@app.exception_handler(ModelUnavailable)
async def model_unavailable_handler(request, exc):
    return JSONResponse(status_code=503, content={"detail": str(exc)})

@app.get('/ready', tags=['System'])
async def readiness():
    return JSONResponse(status_code=200 if ml_service.model_type == 'pipeline' else 503,
                        content={'ready': ml_service.model_type == 'pipeline'})

from app.api.v1.emergency import router as emergency_router
app.include_router(emergency_router, prefix=settings.API_V1_STR, tags=['Emergency resources'])

# Do not echo invalid values (including NaN/Infinity) back into strict JSON responses.
from fastapi.exceptions import RequestValidationError

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request, exc):
    return JSONResponse(status_code=422, content={'detail': [
        {'loc': list(error['loc']), 'msg': error['msg'], 'type': error['type']}
        for error in exc.errors()
    ]})


# Mount assets and SPA fallback if frontend distribution is present
if FRONTEND_DIST and os.path.isdir(FRONTEND_DIST):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend_spa(full_path: str):
        if full_path:
            target = os.path.join(FRONTEND_DIST, full_path)
            if os.path.isfile(target):
                return FileResponse(target)
        index_file = os.path.join(FRONTEND_DIST, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        return RedirectResponse(url="/docs")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)
