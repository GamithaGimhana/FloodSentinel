from fastapi import APIRouter, HTTPException
from app.models.schemas import (PredictionRequest, PredictionResponse, SimulationRequest,
                                SimulationResponse, BatchPredictionRequest, BatchPredictionResponse)
from app.services.ml_service import ml_service
from app.services.alert_categorizer import alert_categorizer
from app.data.districts_geo import SRI_LANKA_DISTRICTS

router = APIRouter()


def scenario_input(request):
    district = next((d for d in SRI_LANKA_DISTRICTS if d["id"] == request.district), None)
    if request.district and district is None:
        raise HTTPException(422, "Unknown district")
    return {
        "latitude": district["lat"] if district else 6.9271,
        "longitude": district["lon"] if district else 79.8612,
        "elevation_m": request.elevation_m,
        "distance_to_river_m": request.distance_to_river_m,
        "rainfall_7d_mm": request.rainfall_7d_mm,
        "monthly_rainfall_mm": request.monthly_rainfall_mm if request.monthly_rainfall_mm is not None else request.rainfall_7d_mm * 3.5,
        "drainage_index": max(.01, 1 - request.soil_saturation_pct / 100),
        "ndvi": request.ndvi if request.ndvi is not None else .32,
        "ndwi": request.ndwi if request.ndwi is not None else .15 + request.soil_saturation_pct * .005,
        "population_density_per_km2": 1500,
        "built_up_percent": 35,
        "infrastructure_score": 55,
    }

# Sync handlers run in FastAPI's worker pool so CPU inference does not block I/O.
@router.post("/predict", response_model=PredictionResponse)
def predict_flood_risk(request: PredictionRequest):
    return ml_service.evaluate(request.model_dump())

@router.post("/simulate", response_model=SimulationResponse)
def simulate_flood_scenario(request: SimulationRequest):
    result = ml_service.evaluate(scenario_input(request))
    return SimulationResponse(**result.model_dump(), scenario_inputs={
        "rainfall_7d_mm": request.rainfall_7d_mm,
        "distance_to_river_m": request.distance_to_river_m,
        "elevation_m": request.elevation_m,
        "soil_saturation_pct": request.soil_saturation_pct,
    }, assumptions=["Soil saturation is used as a drainage proxy.",
                    "Unspecified vegetation, population and infrastructure inputs use demonstration baselines.",
                    "This scenario is not an official flood warning."])

@router.post("/predict/batch", response_model=BatchPredictionResponse)
def batch_predict(request: BatchPredictionRequest):
    results = [ml_service.evaluate(loc.model_dump()) for loc in request.locations]
    return BatchPredictionResponse(total=len(results), predictions=results)

@router.get("/alert-tiers")
def get_alert_tiers():
    return {"tiers": alert_categorizer.get_all_tiers_summary()}
