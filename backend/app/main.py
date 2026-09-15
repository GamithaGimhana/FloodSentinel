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
    logger.info("FloodSentinel Meteorological & Radar Service starting up...")
    try:
        # Pre-warm radar frames cache
        await radar_service.fetch_radar_frames()
        logger.info("RainViewer radar frames cache successfully initialized.")
    except Exception as exc:
        logger.warning(f"Failed to pre-warm radar cache on startup: {exc}")

    # Load ML pipeline (falls back to heuristic if .pkl not found)
    ml_service.load_pipeline()
    logger.info(f"ML inference engine initialized in '{ml_service.model_type}' mode.")

    yield

    logger.info("FloodSentinel Meteorological Service shutting down cleanly.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Production-grade, asynchronous meteorological ingestion service for **FloodSentinel Sri Lanka**.\n\n"
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(
    "/health",
    tags=["System"],
    summary="Service Health Check",
    description="Returns the current operational status, uptime, and service version."
)
async def health_check():
    return {
        "status": "healthy",
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
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
