import asyncio
import logging
import math
from datetime import datetime, timezone, timedelta
from typing import Dict
import httpx
from cachetools import TTLCache
from starlette.concurrency import run_in_threadpool
from app.core.config import settings
from app.data.districts_geo import SRI_LANKA_DISTRICTS
from app.models.weather import (LiveWeatherResponse, CurrentWeather, DailyWeather, SoilMetrics,
                                DistrictTelemetry, DistrictsWeatherResponse)
from app.services.ml_service import ml_service

logger = logging.getLogger(__name__)
WMO_CODE_MAP: Dict[int, str] = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    62: "Rain showers",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snowfall",
    73: "Moderate snowfall",
    75: "Heavy snowfall",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm with rain",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}

class WeatherService:
    def __init__(self):
        self._cache = TTLCache(maxsize=settings.WEATHER_CACHE_MAX_ITEMS, ttl=settings.WEATHER_CACHE_TTL_SECONDS)
        self._failures = TTLCache(maxsize=150, ttl=30)
        self._locks = [asyncio.Lock() for _ in range(32)]
        self._limit = asyncio.Semaphore(5)
        self.client = None

    def _get_cache_key(self, lat, lon):
        return f"{lat:.3f}_{lon:.3f}"

    def _decode_wmo(self, code):
        return WMO_CODE_MAP.get(code, f"Weather code {code}")

    def _calc_soil_saturation(self, moisture):
        return round(min(100, max(0, moisture / .45 * 100)), 1)

    def _build_fallback_weather(self, lat, lon):
        return LiveWeatherResponse(latitude=lat, longitude=lon, status="unavailable",
                                   message="Weather provider is unavailable. No synthetic readings are substituted.")

    async def fetch_live_weather(self, lat, lon, client=None):
        key = self._get_cache_key(lat, lon)
        async with self._locks[hash(key) % len(self._locks)]:
            if key in self._cache:
                return LiveWeatherResponse(**{**self._cache[key], "cached": True, "latitude": lat, "longitude": lon})
            if key in self._failures:
                return self._build_fallback_weather(lat, lon)
            owned = client is None and self.client is None
            active_client = client or self.client or httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT_SECONDS)
            try:
                async with self._limit:
                    response = await active_client.get(settings.OPEN_METEO_BASE_URL, params={
                        "latitude": lat, "longitude": lon,
                        "current": "temperature_2m,precipitation,weather_code,wind_speed_10m",
                        "daily": "precipitation_sum", "hourly": "soil_moisture_0_to_7cm",
                        "timezone": "Asia/Colombo", "past_days": 7, "forecast_days": 1,
                    })
                    response.raise_for_status()
                result = self._parse(response.json(), lat, lon)
                self._cache[key] = result.model_dump()
                return result
            except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
                logger.warning("Weather unavailable for %s: %s", key, exc)
                self._failures[key] = True
                return self._build_fallback_weather(lat, lon)
            finally:
                if owned:
                    await active_client.aclose()

    def _parse(self, data, lat, lon):
        current = data["current"]
        observed = datetime.fromisoformat(current["time"])
        def number(value):
            value = float(value)
            if not math.isfinite(value):
                raise ValueError("Non-finite provider reading")
            return value
        daily = data["daily"]
        pairs = dict(zip(daily["time"], daily["precipitation_sum"], strict=True))
        dates = [(observed.date() - timedelta(days=i)).isoformat() for i in range(7, 0, -1)]
        rainfall = [number(pairs[day]) for day in dates]
        if any(v < 0 for v in rainfall):
            raise ValueError("Negative rainfall")
        hourly = data["hourly"]
        samples = [(datetime.fromisoformat(t), v) for t, v in
                   zip(hourly["time"], hourly["soil_moisture_0_to_7cm"], strict=True)
                   if v is not None and datetime.fromisoformat(t) <= observed]
        if not samples:
            raise ValueError("No soil observation at or before current time")
        soil_time, soil_value = max(samples, key=lambda x: x[0])
        if observed - soil_time > timedelta(hours=2):
            raise ValueError("Soil observation is stale")
        moisture = number(soil_value)
        if not 0 <= moisture <= 1:
            raise ValueError("Invalid soil moisture")
        interval = number(current["interval"])
        if interval <= 0:
            raise ValueError("Invalid observation interval")
        return LiveWeatherResponse(
            latitude=lat, longitude=lon,
            elevation_m=number(data["elevation"]) if data.get("elevation") is not None else None,
            current=CurrentWeather(temperature_2m=number(current["temperature_2m"]),
                precipitation=round(number(current["precipitation"]) * 3600 / interval, 2),
                wind_speed_10m=number(current["wind_speed_10m"]) if current.get("wind_speed_10m") is not None else None,
                weather_code=int(current["weather_code"]), condition_text=self._decode_wmo(int(current["weather_code"])),
                time=observed.replace(tzinfo=timezone(timedelta(hours=5, minutes=30))).isoformat()),
            daily=DailyWeather(precipitation_sum_7d=round(sum(rainfall), 1), max_daily_rainfall=max(rainfall),
                               dates=dates, rain_values=rainfall),
            soil=SoilMetrics(soil_moisture_surface=moisture, saturation_pct=self._calc_soil_saturation(moisture)),
            cached_at=datetime.now(timezone.utc).isoformat())

    async def fetch_district_weather(self, district):
        weather = await self.fetch_live_weather(district["lat"], district["lon"])
        prediction = None
        assumptions = ["District reference elevation; river distance assumed to be 1,000 m.",
                       "Vegetation, drainage and demographic features are scenario proxies."]
        if weather.status == "live":
            raw = {
                "latitude": district["lat"], "longitude": district["lon"],
                "elevation_m": district["elevation_m"], "distance_to_river_m": 1000,
                "rainfall_7d_mm": weather.daily.precipitation_sum_7d,
                "monthly_rainfall_mm": weather.daily.precipitation_sum_7d * 3.5,
                "drainage_index": max(.01, 1 - weather.soil.saturation_pct / 100),
                "ndvi": .32, "ndwi": .15 + weather.soil.saturation_pct * .005,
                "population_density_per_km2": 1500, "built_up_percent": 35, "infrastructure_score": 55,
            }
            prediction = await run_in_threadpool(ml_service.evaluate, raw)
        return DistrictTelemetry(id=district["id"], name=district["name"], province=district["province"],
            latitude=district["lat"], longitude=district["lon"], status=weather.status,
            current_temp=weather.current.temperature_2m if weather.current else None,
            current_rain_mm=weather.current.precipitation if weather.current else None,
            rain_7d_mm=weather.daily.precipitation_sum_7d if weather.daily else None,
            soil_saturation_pct=weather.soil.saturation_pct if weather.soil else None,
            risk_tier=prediction.alert_level if prediction else None,
            risk_score=prediction.risk_score if prediction else None,
            prediction=prediction, observed_at=weather.current.time if weather.current else None, assumptions=assumptions)

    async def fetch_districts_weather(self):
        results = await asyncio.gather(*(self.fetch_district_weather(d) for d in SRI_LANKA_DISTRICTS))
        return DistrictsWeatherResponse(total_districts=len(results),
            generated_at=datetime.now(timezone.utc).isoformat(), districts=results)

weather_service = WeatherService()
