"""The exported model's raw feature contract; no implicit inputs for direct predictions."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

class StrictModel(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, extra='forbid')

class PredictionRequest(StrictModel):
    district: str
    elevation_m: float = Field(ge=0, le=2600)
    distance_to_river_m: float = Field(ge=0, le=100000)
    landcover: Literal['Agriculture', 'Forest', 'Grassland', 'Urban', 'Wetland']
    soil_type: Literal['Clay', 'Loamy', 'Sandy', 'Silty']
    water_supply: Literal['Municipal', 'Surface water', 'Well']
    electricity: Literal['Grid', 'Mixed', 'Off-grid (solar)', 'Unavailable']
    road_quality: Literal['Fair', 'Good (paved)', 'Poor (unpaved)']
    urban_rural: Literal['Rural', 'Urban']
    rainfall_7d_mm: float = Field(ge=0, le=5000)
    rainfall_24h_mm: float = Field(ge=0, le=5000)
    rainfall_30d_mm: float = Field(ge=0, le=10000)
    height_above_nearest_drainage_m: float = Field(ge=0, le=2600)
    soil_saturation_index: float = Field(ge=0, le=1)
    drainage_index: float = Field(ge=0, le=1)
    historical_flood_count: int = Field(ge=0, le=10000)
    infrastructure_score: float = Field(ge=0, le=100)
    population_density_per_km2: float = Field(ge=0, le=1000000)
    built_up_percent: float = Field(ge=0, le=100)
    nearest_hospital_km: float = Field(ge=0, le=1000)
    nearest_evac_km: float = Field(ge=0, le=1000)

    @model_validator(mode='after')
    def rainfall_order(self):
        if not self.rainfall_24h_mm <= self.rainfall_7d_mm <= self.rainfall_30d_mm:
            raise ValueError('Rainfall must satisfy 24h <= 7d <= 30d')
        return self

    @field_validator('district')
    @classmethod
    def district_name(cls, value):
        from app.data.districts_geo import SRI_LANKA_DISTRICTS
        match = next((d for d in SRI_LANKA_DISTRICTS if value.strip().lower() in (d['id'], d['name'].lower())), None)
        if match is None:
            raise ValueError('Unknown Sri Lankan district')
        return match['name']

class EngineeredFeatures(StrictModel):
    hydrological_stress_index: float
    drainage_saturation_ratio: float
    rainfall_intensity_ratio: float
    river_proximity_buffer: float
    log_population_density: float
    runoff_vulnerability: float

class PredictionResponse(StrictModel):
    flood_probability: float = Field(ge=0, le=1)
    binary_prediction: Literal[0, 1]
    risk_score: int = Field(ge=0, le=100)
    alert_level: Literal['SAFE', 'ADVISORY', 'WARNING', 'CRITICAL']
    alert_emoji: str
    alert_color: str
    recommended_action: str
    engineered_features: EngineeredFeatures
    model_type: Literal['pipeline'] = 'pipeline'
    model_version: str = 'unknown'
    input_warnings: list[str] = Field(default_factory=list)
    threshold_used: float
    data_scope: str = 'Synthetic balanced training distribution (50% flood); score is not a real-world flood probability or validated forecast.'
    tier_policy: str = 'Colour bands describe experimental score ranges. The binary decision uses the model threshold; a lower score does not establish safety.'

class SimulationRequest(StrictModel):
    rainfall_7d_mm: float = Field(default=50, ge=0, le=5000)
    distance_to_river_m: float = Field(default=2000, ge=0, le=100000)
    elevation_m: float = Field(default=50, ge=0, le=2600)
    soil_saturation_pct: float = Field(default=40, ge=0, le=100)
    rainfall_24h_mm: float | None = Field(default=None, ge=0, le=5000)
    rainfall_30d_mm: float | None = Field(default=None, ge=0, le=10000)
    height_above_nearest_drainage_m: float = Field(default=5, ge=0, le=2600)
    drainage_index: float = Field(default=.5, ge=0, le=1)
    district: str | None = None

class SimulationResponse(PredictionResponse):
    scenario_inputs: dict[str, float]
    assumptions: list[str] = Field(default_factory=list)

class BatchPredictionRequest(StrictModel):
    locations: list[PredictionRequest] = Field(min_length=1, max_length=25)

class BatchPredictionResponse(StrictModel):
    total: int
    predictions: list[PredictionResponse]

class ForecastRequest(StrictModel):
    site: PredictionRequest
    latitude: float = Field(ge=5.8, le=10)
    longitude: float = Field(ge=79.4, le=82.1)
    days: int = Field(default=7, ge=1, le=7)

class ForecastDay(StrictModel):
    valid_date: str
    inputs: PredictionRequest
    prediction: PredictionResponse

class ForecastResponse(StrictModel):
    generated_at: str
    weather_reference_time: str
    latitude: float
    longitude: float
    source: str = 'Open-Meteo'
    forecast_type: str = 'Weather-conditioned synthetic scenario projection; not a validated flood forecast'
    assumptions: list[str]
    days: list[ForecastDay]
