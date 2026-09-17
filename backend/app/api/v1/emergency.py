from fastapi import APIRouter, Query
from app.services.emergency_service import emergency_service
from app.services.weather_service import weather_service

router = APIRouter()

@router.get('/emergency/nearby')
async def nearby(lat: float = Query(ge=5.8, le=10), lon: float = Query(ge=79.4, le=82.1),
                 radius_km: int = Query(default=15, ge=1, le=30)):
    return await emergency_service.nearby(lat, lon, radius_km, weather_service.client)
