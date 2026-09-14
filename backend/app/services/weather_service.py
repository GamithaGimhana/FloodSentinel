import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import httpx
from cachetools import TTLCache

from app.core.config import settings
from app.data.districts_geo import SRI_LANKA_DISTRICTS
from app.models.weather import (
    LiveWeatherResponse,
    CurrentWeather,
    DailyWeather,
    SoilMetrics,
    DistrictTelemetry,
    DistrictsWeatherResponse,
)

logger = logging.getLogger(__name__)

# WMO Weather Interpretation Codes (WW)
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
    """Asynchronous service for ingesting real-time Open-Meteo weather data with TTL caching."""

    def __init__(self):
        # Cache keyed by rounded (lat, lon) -> (response_dict, cached_at_iso)
        self._cache = TTLCache(
            maxsize=settings.WEATHER_CACHE_MAX_ITEMS,
            ttl=settings.WEATHER_CACHE_TTL_SECONDS
        )
        # Dedicated cache for 25-districts aggregated telemetry
        self._districts_cache = TTLCache(maxsize=2, ttl=settings.WEATHER_CACHE_TTL_SECONDS)

    def _get_cache_key(self, lat: float, lon: float) -> str:
        """Rounds coordinates to 2 decimal places (~1.1km) for cache keying."""
        return f"{round(lat, 2)}_{round(lon, 2)}"

    def _decode_wmo(self, code: int) -> str:
        return WMO_CODE_MAP.get(code, f"Weather code {code}")

    def _calc_soil_saturation(self, moisture_m3: float) -> float:
        """Converts volumetric water content (m3/m3) to percentage saturation.
        Tropical Sri Lankan soils have typical field saturation capacity ~0.45 m3/m3."""
        if moisture_m3 <= 0:
            return 10.0
        pct = (moisture_m3 / 0.45) * 100.0
        return round(min(100.0, max(5.0, pct)), 1)

    def _calc_risk_tier_and_score(
        self, rain_7d: float, rain_current: float, soil_sat: float, base_vuln: float
    ) -> tuple[str, float]:
        """Heuristic flood risk tier calculator integrating precipitation and soil hydrology."""
        # Weighted score (0.0 to 1.0)
        rain_7d_norm = min(1.0, rain_7d / 250.0)
        rain_cur_norm = min(1.0, (rain_current * 4) / 100.0)
        soil_norm = min(1.0, soil_sat / 100.0)

        raw_score = (
            (rain_7d_norm * 0.45) +
            (rain_cur_norm * 0.20) +
            (soil_norm * 0.20) +
            (base_vuln * 0.15)
        )
        score = round(min(1.0, max(0.05, raw_score)), 2)

        if score >= 0.76:
            tier = "CRITICAL"
        elif score >= 0.51:
            tier = "WARNING"
        elif score >= 0.26:
            tier = "ADVISORY"
        else:
            tier = "SAFE"

        return tier, score

    async def fetch_live_weather(
        self, lat: float, lon: float, client: Optional[httpx.AsyncClient] = None
    ) -> LiveWeatherResponse:
        """Fetches live meteorological parameters for specific latitude and longitude."""
        cache_key = self._get_cache_key(lat, lon)
        if cache_key in self._cache:
            cached_item = self._cache[cache_key]
            res = LiveWeatherResponse(**cached_item)
            res.cached = True
            return res

        url = settings.OPEN_METEO_BASE_URL
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,precipitation,weather_code",
            "daily": "precipitation_sum",
            "hourly": "soil_moisture_0_to_7cm",
            "timezone": "Asia/Colombo",
            "forecast_days": 7,
            "past_days": 6
        }

        should_close = False
        if client is None:
            client = httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT_SECONDS)
            should_close = True

        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

            # Parse current metrics
            current_raw = data.get("current", {})
            temp = float(current_raw.get("temperature_2m", 28.0))
            rain_cur = float(current_raw.get("precipitation", 0.0))
            w_code = int(current_raw.get("weather_code", 0))
            w_text = self._decode_wmo(w_code)
            cur_time = current_raw.get("time", datetime.now(timezone.utc).isoformat())

            # Parse daily precipitation
            daily_raw = data.get("daily", {})
            dates = daily_raw.get("time", [])
            rain_vals = [float(v) if v is not None else 0.0 for v in daily_raw.get("precipitation_sum", [])]
            rain_7d = round(sum(rain_vals[-7:]) if rain_vals else 0.0, 1)
            max_daily = round(max(rain_vals) if rain_vals else 0.0, 1)

            # Parse soil moisture (hourly topsoil moisture)
            hourly_raw = data.get("hourly", {})
            soil_vals = [v for v in hourly_raw.get("soil_moisture_0_to_7cm", []) if v is not None]
            surface_moisture = round(soil_vals[-1] if soil_vals else 0.28, 3)
            soil_sat = self._calc_soil_saturation(surface_moisture)

            now_iso = datetime.now(timezone.utc).isoformat()
            response_obj = LiveWeatherResponse(
                latitude=lat,
                longitude=lon,
                timezone="Asia/Colombo",
                current=CurrentWeather(
                    temperature_2m=temp,
                    precipitation=rain_cur,
                    weather_code=w_code,
                    condition_text=w_text,
                    time=cur_time
                ),
                daily=DailyWeather(
                    precipitation_sum_7d=rain_7d,
                    max_daily_rainfall=max_daily,
                    dates=dates[-7:],
                    rain_values=rain_vals[-7:]
                ),
                soil=SoilMetrics(
                    soil_moisture_surface=surface_moisture,
                    saturation_pct=soil_sat
                ),
                cached=False,
                cached_at=now_iso
            )

            # Save in TTL Cache
            self._cache[cache_key] = response_obj.model_dump()
            return response_obj

        except Exception as exc:
            logger.warning(f"Error calling Open-Meteo for ({lat}, {lon}): {exc}. Returning resilient baseline.")
            return self._build_fallback_weather(lat, lon)
        finally:
            if should_close:
                await client.aclose()

    def _build_fallback_weather(self, lat: float, lon: float) -> LiveWeatherResponse:
        """Generates realistic Sri Lankan fallback weather metrics if external API is unreachable."""
        now_iso = datetime.now(timezone.utc).isoformat()
        # Estimate reasonable baseline based on location
        is_wet_zone = (lat < 7.5 and lon < 80.8)
        base_temp = 28.5 if is_wet_zone else 31.0
        base_rain_7d = 85.0 if is_wet_zone else 25.0
        soil_sat = 55.0 if is_wet_zone else 32.0

        return LiveWeatherResponse(
            latitude=lat,
            longitude=lon,
            timezone="Asia/Colombo",
            current=CurrentWeather(
                temperature_2m=base_temp,
                precipitation=0.0,
                weather_code=2,
                condition_text="Partly cloudy (Fallback telemetry)",
                time=now_iso
            ),
            daily=DailyWeather(
                precipitation_sum_7d=base_rain_7d,
                max_daily_rainfall=22.0,
                dates=["Day-6", "Day-5", "Day-4", "Day-3", "Day-2", "Yesterday", "Today"],
                rain_values=[12.0, 5.0, 18.0, 10.0, 15.0, 10.0, 15.0]
            ),
            soil=SoilMetrics(
                soil_moisture_surface=0.25,
                saturation_pct=soil_sat
            ),
            cached=False,
            cached_at=now_iso
        )

    async def fetch_districts_weather(self) -> DistrictsWeatherResponse:
        """Aggregates real-time weather and calculated flood risk across all 25 Sri Lankan districts."""
        if "all_districts" in self._districts_cache:
            cached_data = self._districts_cache["all_districts"]
            return DistrictsWeatherResponse(**cached_data)

        async with httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT_SECONDS) as client:
            tasks = [
                self.fetch_live_weather(d["lat"], d["lon"], client=client)
                for d in SRI_LANKA_DISTRICTS
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        telemetries = []
        for d, result in zip(SRI_LANKA_DISTRICTS, results):
            if isinstance(result, Exception):
                logger.error(f"Failed fetching weather for district {d['name']}: {result}")
                weather = self._build_fallback_weather(d["lat"], d["lon"])
            else:
                weather = result

            tier, score = self._calc_risk_tier_and_score(
                rain_7d=weather.daily.precipitation_sum_7d,
                rain_current=weather.current.precipitation,
                soil_sat=weather.soil.saturation_pct,
                base_vuln=d.get("base_vuln", 0.5)
            )

            telemetries.append(
                DistrictTelemetry(
                    id=d["id"],
                    name=d["name"],
                    province=d["province"],
                    latitude=d["lat"],
                    longitude=d["lon"],
                    current_temp=weather.current.temperature_2m,
                    current_rain_mm=weather.current.precipitation,
                    rain_7d_mm=weather.daily.precipitation_sum_7d,
                    soil_saturation_pct=weather.soil.saturation_pct,
                    risk_tier=tier,
                    risk_score=score
                )
            )

        response = DistrictsWeatherResponse(
            total_districts=len(telemetries),
            generated_at=datetime.now(timezone.utc).isoformat(),
            districts=telemetries
        )

        self._districts_cache["all_districts"] = response.model_dump()
        return response


weather_service = WeatherService()
