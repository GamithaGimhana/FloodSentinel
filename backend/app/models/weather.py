from typing import Literal
from pydantic import BaseModel, Field
from app.models.schemas import PredictionResponse

class CurrentWeather(BaseModel):
    temperature_2m: float
    precipitation: float
    wind_speed_10m: float | None = None
    weather_code: int
    condition_text: str
    time: str

class DailyWeather(BaseModel):
    precipitation_sum_24h: float
    precipitation_sum_30d: float
    precipitation_sum_7d: float
    max_daily_rainfall: float
    dates: list[str]
    rain_values: list[float]

class SoilMetrics(BaseModel):
    soil_moisture_surface: float
    saturation_pct: float

class ForecastWeatherDay(BaseModel):
    date: str
    rainfall_24h_mm: float
    rainfall_7d_mm: float
    rainfall_30d_mm: float
    soil_saturation_index: float

class LiveWeatherResponse(BaseModel):
    latitude: float
    longitude: float
    timezone: str = "Asia/Colombo"
    status: Literal["live", "unavailable"] = "live"
    source: str = "Open-Meteo"
    message: str | None = None
    current: CurrentWeather | None = None
    daily: DailyWeather | None = None
    soil: SoilMetrics | None = None
    elevation_m: float | None = None
    forecast: list[ForecastWeatherDay] = Field(default_factory=list)
    forecast_status: str = 'unavailable'
    cached: bool = False
    cached_at: str | None = None

class DistrictTelemetry(BaseModel):
    id: str
    name: str
    province: str
    latitude: float
    longitude: float
    status: Literal["live", "unavailable"]
    current_temp: float | None = None
    current_rain_mm: float | None = None
    rain_7d_mm: float | None = None
    soil_saturation_pct: float | None = None
    risk_tier: str | None = None
    risk_score: int | None = None
    prediction: PredictionResponse | None = None
    observed_at: str | None = None
    assumptions: list[str] = Field(default_factory=list)
    assessment_inputs: dict[str, str | float | int] = Field(default_factory=dict)
    input_sources: dict[str, str] = Field(default_factory=dict)
    history_status: Literal['recorded', 'unavailable', 'not_recorded'] = 'not_recorded'

class DistrictsWeatherResponse(BaseModel):
    total_districts: int
    generated_at: str
    districts: list[DistrictTelemetry]

class RadarFrame(BaseModel):
    time: int
    path: str
    tile_url_template: str
    iso_timestamp: str
    kind: Literal["observed", "forecast"] = "observed"

class RadarFramesResponse(BaseModel):
    host: str
    generated_at: int
    frames: list[RadarFrame]
    latest_frame: RadarFrame | None = None
    status: Literal["live", "unavailable"] = "live"
    message: str | None = None
