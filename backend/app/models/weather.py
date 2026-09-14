from pydantic import BaseModel, Field
from typing import List, Optional


class CurrentWeather(BaseModel):
    temperature_2m: float = Field(..., description="Air temperature at 2 meters above ground in °C")
    precipitation: float = Field(..., description="Current precipitation intensity in mm/hour")
    weather_code: int = Field(..., description="WMO Weather interpretation code")
    condition_text: str = Field(..., description="Human-readable description of current conditions")
    time: str = Field(..., description="Observation timestamp in ISO format")


class DailyWeather(BaseModel):
    precipitation_sum_7d: float = Field(..., description="Cumulative 7-day rainfall in mm")
    max_daily_rainfall: float = Field(..., description="Highest single-day precipitation recorded in 7 days (mm)")
    dates: List[str] = Field(default_factory=list, description="Array of ISO dates for the 7-day period")
    rain_values: List[float] = Field(default_factory=list, description="Daily rainfall amounts in mm corresponding to dates")


class SoilMetrics(BaseModel):
    soil_moisture_surface: float = Field(..., description="Volumetric water content in top 0-7 cm of soil (m³/m³)")
    saturation_pct: float = Field(..., description="Estimated soil saturation percentage (0-100%)")


class LiveWeatherResponse(BaseModel):
    latitude: float
    longitude: float
    timezone: str = "Asia/Colombo"
    current: CurrentWeather
    daily: DailyWeather
    soil: SoilMetrics
    cached: bool = Field(default=False, description="Whether this response was served from in-memory cache")
    cached_at: Optional[str] = None


class DistrictTelemetry(BaseModel):
    id: str = Field(..., description="Unique district slug (e.g. colombo, ratnapura)")
    name: str = Field(..., description="District display name")
    province: str = Field(..., description="Administrative province")
    latitude: float
    longitude: float
    current_temp: float = Field(..., description="Current temperature in °C")
    current_rain_mm: float = Field(..., description="Current hourly precipitation in mm/h")
    rain_7d_mm: float = Field(..., description="Cumulative 7-day rainfall in mm")
    soil_saturation_pct: float = Field(..., description="Calculated soil saturation %")
    risk_tier: str = Field(..., description="Calculated meteorological risk tier: SAFE, ADVISORY, WARNING, CRITICAL")
    risk_score: float = Field(..., description="Estimated flood risk probability index (0.00 - 1.00)")


class DistrictsWeatherResponse(BaseModel):
    total_districts: int
    generated_at: str
    districts: List[DistrictTelemetry]


class RadarFrame(BaseModel):
    time: int = Field(..., description="Unix epoch timestamp of radar scan")
    path: str = Field(..., description="RainViewer tile path for this frame")
    tile_url_template: str = Field(..., description="Ready-to-use Leaflet tile URL template with {z}/{x}/{y}")
    iso_timestamp: str = Field(..., description="Human-readable ISO 8601 UTC timestamp")


class RadarFramesResponse(BaseModel):
    host: str = Field(..., description="RainViewer tile host")
    generated_at: int = Field(..., description="Unix epoch timestamp when metadata was generated")
    frames: List[RadarFrame] = Field(..., description="Chronological array of past and nowcast radar frames")
    latest_frame: Optional[RadarFrame] = Field(None, description="Most recent radar frame available")
