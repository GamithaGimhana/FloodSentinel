"""Pydantic schemas for ML prediction request/response and simulation endpoints."""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict


class PredictionRequest(BaseModel):
    """Raw geospatial and meteorological input features for flood risk prediction."""
    latitude: float = Field(..., ge=5.8, le=10.0, description="Latitude within Sri Lanka")
    longitude: float = Field(..., ge=79.4, le=82.1, description="Longitude within Sri Lanka")
    elevation_m: float = Field(..., ge=0, le=2500, description="Ground elevation in meters above sea level")
    distance_to_river_m: float = Field(..., ge=0, le=50000, description="Distance to nearest river channel in meters")
    rainfall_7d_mm: float = Field(..., ge=0, le=1000, description="Cumulative 7-day rainfall in millimeters")
    monthly_rainfall_mm: float = Field(..., ge=0, le=3000, description="Monthly accumulated rainfall in mm")
    drainage_index: float = Field(..., ge=0, le=1.0, description="Soil drainage capacity index (0=poor, 1=excellent)")
    ndvi: float = Field(..., ge=-1.0, le=1.0, description="Normalized Difference Vegetation Index")
    ndwi: float = Field(..., ge=-1.0, le=1.0, description="Normalized Difference Water Index")
    population_density_per_km2: float = Field(..., ge=0, description="Population density per sq km")
    built_up_percent: float = Field(default=25.0, ge=0, le=100, description="Built-up area percentage")
    infrastructure_score: float = Field(default=50.0, ge=0, le=100, description="Infrastructure resilience score")
    electricity: str = Field(default="Grid", description="Electricity source type")
    district: Optional[str] = Field(default=None, description="Sri Lankan district name (optional)")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "latitude": 6.9271,
                    "longitude": 79.8612,
                    "elevation_m": 10,
                    "distance_to_river_m": 450,
                    "rainfall_7d_mm": 185.5,
                    "monthly_rainfall_mm": 420.0,
                    "drainage_index": 0.32,
                    "ndvi": 0.28,
                    "ndwi": 0.45,
                    "population_density_per_km2": 3520,
                    "built_up_percent": 65.0,
                    "infrastructure_score": 72.0,
                    "electricity": "Grid",
                    "district": "Colombo"
                }
            ]
        }
    }


class EngineeredFeatures(BaseModel):
    """The 6 domain-specific features computed from raw inputs."""
    hydrological_stress_index: float = Field(..., description="rainfall_7d / (elevation + 1)")
    drainage_saturation_ratio: float = Field(..., description="monthly_rainfall / (drainage_index + 0.01)")
    water_veg_contrast: float = Field(..., description="ndwi - ndvi")
    river_proximity_buffer: float = Field(..., description="1000 / (distance_to_river + 1)")
    log_population_density: float = Field(..., description="log(pop_density + 1)")
    runoff_vulnerability: float = Field(..., description="(rainfall_7d * ndwi) / (elevation + 1)")


class PredictionResponse(BaseModel):
    """Complete flood prediction result with alert categorization."""
    flood_probability: float = Field(..., description="Calibrated flood probability (0.0 to 1.0)")
    binary_prediction: int = Field(..., description="Binary flood prediction (0=No, 1=Yes)")
    risk_score: int = Field(..., description="Risk score scaled to 0-100")
    alert_level: str = Field(..., description="Alert tier: SAFE, ADVISORY, WARNING, CRITICAL")
    alert_emoji: str = Field(..., description="Alert level emoji indicator")
    alert_color: str = Field(..., description="Hex color code for UI rendering")
    recommended_action: str = Field(..., description="DMC-aligned recommended action text")
    engineered_features: EngineeredFeatures = Field(..., description="Computed domain features used for prediction")
    model_type: str = Field(default="heuristic", description="Model backend: 'pipeline' or 'heuristic'")
    threshold_used: float = Field(..., description="Decision threshold applied")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "flood_probability": 0.82,
                    "binary_prediction": 1,
                    "risk_score": 82,
                    "alert_level": "CRITICAL",
                    "alert_emoji": "🔴",
                    "alert_color": "#ef4444",
                    "recommended_action": "IMMINENT FLOOD THREAT — EVACUATE IMMEDIATELY.",
                    "engineered_features": {
                        "hydrological_stress_index": 16.86,
                        "drainage_saturation_ratio": 1272.73,
                        "water_veg_contrast": 0.17,
                        "river_proximity_buffer": 2.22,
                        "log_population_density": 8.17,
                        "runoff_vulnerability": 7.59
                    },
                    "model_type": "heuristic",
                    "threshold_used": 0.35
                }
            ]
        }
    }


class SimulationRequest(BaseModel):
    """Simplified input for What-If scenario testing from frontend ScenarioSliders."""
    rainfall_7d_mm: float = Field(default=50.0, ge=0, le=500, description="7-day rainfall slider (mm)")
    distance_to_river_m: float = Field(default=2000.0, ge=50, le=5000, description="River proximity slider (m)")
    elevation_m: float = Field(default=50.0, ge=5, le=500, description="Elevation slider (m)")
    soil_saturation_pct: float = Field(default=40.0, ge=0, le=100, description="Soil saturation slider (%)")

    # Optional overrides (defaults filled from typical wet-zone baselines)
    monthly_rainfall_mm: Optional[float] = Field(default=None, description="Override monthly rainfall")
    ndvi: Optional[float] = Field(default=None, description="Override NDVI")
    ndwi: Optional[float] = Field(default=None, description="Override NDWI")
    district: Optional[str] = Field(default=None, description="District context")


class SimulationResponse(BaseModel):
    """Simulation result matching PredictionResponse structure for frontend compatibility."""
    flood_probability: float
    binary_prediction: int
    risk_score: int
    alert_level: str
    alert_emoji: str
    alert_color: str
    recommended_action: str
    engineered_features: EngineeredFeatures
    scenario_inputs: Dict[str, float] = Field(..., description="Echoed slider values used for the simulation")


class BatchPredictionRequest(BaseModel):
    """Batch prediction for multiple locations simultaneously."""
    locations: List[PredictionRequest] = Field(..., min_length=1, max_length=25)


class BatchPredictionResponse(BaseModel):
    """Batch prediction results."""
    total: int
    predictions: List[PredictionResponse]
