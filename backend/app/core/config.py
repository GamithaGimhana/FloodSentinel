import os
from typing import List
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseModel):
    """Application and external meteorological service settings."""
    PROJECT_NAME: str = "FloodSentinel - Meteorological & Radar Ingestion Service"
    API_V1_STR: str = "/api/v1"
    VERSION: str = "1.0.0"

    # CORS configuration
    CORS_ORIGINS: List[str] = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

    # Open-Meteo API config
    OPEN_METEO_BASE_URL: str = os.getenv("OPEN_METEO_BASE_URL", "https://api.open-meteo.com/v1/forecast")
    WEATHER_CACHE_TTL_SECONDS: int = int(os.getenv("WEATHER_CACHE_TTL_SECONDS", "600"))
    WEATHER_CACHE_MAX_ITEMS: int = int(os.getenv("WEATHER_CACHE_MAX_ITEMS", "150"))

    # RainViewer API config
    RAINVIEWER_BASE_URL: str = os.getenv("RAINVIEWER_BASE_URL", "https://api.rainviewer.com/public/weather-maps.json")
    RADAR_CACHE_TTL_SECONDS: int = int(os.getenv("RADAR_CACHE_TTL_SECONDS", "300"))

    # Sri Lanka geographic boundaries and defaults
    DEFAULT_LATITUDE: float = 7.8731
    DEFAULT_LONGITUDE: float = 80.7718
    SL_MIN_LAT: float = 5.8
    SL_MAX_LAT: float = 10.0
    SL_MIN_LON: float = 79.4
    SL_MAX_LON: float = 82.1

    # HTTP client timeouts
    HTTP_TIMEOUT_SECONDS: float = float(os.getenv("HTTP_TIMEOUT_SECONDS", "12.0"))


settings = Settings()
