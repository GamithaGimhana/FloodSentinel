from fastapi import APIRouter, Query, HTTPException
from typing import Optional

from app.core.config import settings
from app.models.weather import (
    LiveWeatherResponse,
    DistrictsWeatherResponse,
    DistrictTelemetry,
    RadarFramesResponse,
)
from app.services.weather_service import weather_service
from app.services.radar_service import radar_service

router = APIRouter()


@router.get(
    "/weather/live",
    response_model=LiveWeatherResponse,
    summary="Get real-time meteorological conditions for a coordinate",
    description="Calls Open-Meteo with in-memory caching to retrieve temperature, hourly precipitation, 7-day cumulative rainfall, and topsoil saturation."
)
async def get_live_weather(
    lat: float = Query(
        settings.DEFAULT_LATITUDE,
        ge=settings.SL_MIN_LAT,
        le=settings.SL_MAX_LAT,
        description="Latitude coordinate within Sri Lanka bounding box"
    ),
    lon: float = Query(
        settings.DEFAULT_LONGITUDE,
        ge=settings.SL_MIN_LON,
        le=settings.SL_MAX_LON,
        description="Longitude coordinate within Sri Lanka bounding box"
    )
):
    return await weather_service.fetch_live_weather(lat, lon)


@router.get(
    "/weather/districts",
    response_model=DistrictsWeatherResponse,
    summary="Get aggregated meteorological telemetry and flood risk tiers for all 25 Sri Lankan districts",
    description="Returns pre-fetched or live meteorological observations across all 25 administrative districts."
)
async def get_all_districts_weather():
    return await weather_service.fetch_districts_weather()


@router.get(
    "/weather/districts/{district_id}",
    response_model=DistrictTelemetry,
    summary="Get live telemetry for a specific Sri Lankan district by ID",
    description="Drill-down into an individual district (e.g. 'colombo', 'ratnapura', 'kalutara')."
)
async def get_single_district_weather(district_id: str):
    districts_resp = await weather_service.fetch_districts_weather()
    target = district_id.strip().lower()
    for d in districts_resp.districts:
        if d.id == target:
            return d
    raise HTTPException(status_code=404, detail=f"District '{district_id}' not found in Sri Lanka districts registry.")


@router.get(
    "/radar/frames",
    response_model=RadarFramesResponse,
    summary="Get live RainViewer Doppler radar tile frames",
    description="Returns active radar frame timestamps and Leaflet-ready tile URL templates to animate rain clouds over Sri Lanka."
)
async def get_radar_frames():
    return await radar_service.fetch_radar_frames()
