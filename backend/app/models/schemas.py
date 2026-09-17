"""The exported model's raw feature contract; no implicit inputs for direct predictions."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

class StrictModel(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, extra='forbid')

class PredictionRequest(StrictModel):
    district: str
    latitude: float = Field(ge=5.8, le=10)
    longitude: float = Field(ge=79.4, le=82.1)
    elevation_m: float = Field(ge=0, le=2600)
    distance_to_river_m: float = Field(ge=0, le=100000)
    landcover: Literal['Agriculture', 'Bare Soil', 'Forest', 'Plantation', 'Scrub', 'Urban', 'Wetland']
    soil_type: Literal['Clay', 'Loamy', 'Peaty', 'Sandy', 'Silty']
    water_supply: Literal['Municipal', 'Rainwater harvesting', 'Surface water', 'Tube-well', 'Well']
    electricity: Literal['Grid', 'Mixed', 'Off-grid (solar)']
    road_quality: Literal['Fair', 'Good (paved)', 'No road access', 'Poor (unpaved)']
    urban_rural: Literal['Rural', 'Urban']
    rainfall_7d_mm: float = Field(ge=0, le=5000)
    monthly_rainfall_mm: float = Field(ge=0, le=10000)
    drainage_index: float = Field(ge=0, le=1)
    ndvi: float = Field(ge=-1, le=1)
    ndwi: float = Field(ge=-1, le=1)
    water_presence_flag: Literal['Likely', 'Unlikely']
    historical_flood_count: int = Field(ge=0, le=10000)
    infrastructure_score: float = Field(ge=0, le=100)
    population_density_per_km2: float = Field(ge=0, le=1000000)
    built_up_percent: float = Field(ge=0, le=100)
    nearest_hospital_km: float = Field(ge=0, le=1000)
    nearest_evac_km: float = Field(ge=0, le=1000)

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
    water_veg_contrast: float
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
    threshold_used: float
    data_scope: str = 'Synthetic training data; experimental current-event classification, not a validated forecast.'
    tier_policy: str = 'Display tiers are separate from the binary decision threshold; SAFE is not a safety guarantee.'

class SimulationRequest(StrictModel):
    rainfall_7d_mm: float = Field(default=50, ge=0, le=500)
    distance_to_river_m: float = Field(default=2000, ge=50, le=5000)
    elevation_m: float = Field(default=50, ge=0, le=2500)
    soil_saturation_pct: float = Field(default=40, ge=0, le=100)
    monthly_rainfall_mm: float | None = Field(default=None, ge=0, le=10000)
    ndvi: float | None = Field(default=None, ge=-1, le=1)
    ndwi: float | None = Field(default=None, ge=-1, le=1)
    district: str | None = None

class SimulationResponse(PredictionResponse):
    scenario_inputs: dict[str, float]
    assumptions: list[str] = Field(default_factory=list)

class BatchPredictionRequest(StrictModel):
    locations: list[PredictionRequest] = Field(min_length=1, max_length=25)

class BatchPredictionResponse(StrictModel):
    total: int
    predictions: list[PredictionResponse]
