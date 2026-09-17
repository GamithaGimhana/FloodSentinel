from fastapi import APIRouter, HTTPException
from app.models.schemas import (PredictionRequest, PredictionResponse, SimulationRequest,
                                SimulationResponse, BatchPredictionRequest, BatchPredictionResponse)
from app.services.ml_service import ml_service
from app.services.alert_categorizer import alert_categorizer
from app.data.districts_geo import SRI_LANKA_DISTRICTS

from app.services.scenario import validated_baseline, ASSUMPTIONS

router = APIRouter()


def scenario_input(request):
    district = next((d for d in SRI_LANKA_DISTRICTS if request.district and request.district.lower() in (d["id"], d["name"].lower())), None)
    if request.district and district is None:
        raise HTTPException(422, "Unknown district")
    district = district or SRI_LANKA_DISTRICTS[0]
    return validated_baseline(district,
        elevation_m=request.elevation_m, distance_to_river_m=request.distance_to_river_m,
        rainfall_7d_mm=request.rainfall_7d_mm,
        monthly_rainfall_mm=request.monthly_rainfall_mm if request.monthly_rainfall_mm is not None else request.rainfall_7d_mm * 3.5,
        drainage_index=max(.01, 1 - request.soil_saturation_pct / 100),
        ndvi=request.ndvi if request.ndvi is not None else .32,
        ndwi=request.ndwi if request.ndwi is not None else .15 + request.soil_saturation_pct * .005)

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
    }, assumptions=ASSUMPTIONS)

@router.post("/predict/batch", response_model=BatchPredictionResponse)
def batch_predict(request: BatchPredictionRequest):
    results = [ml_service.evaluate(loc.model_dump()) for loc in request.locations]
    return BatchPredictionResponse(total=len(results), predictions=results)

@router.get("/alert-tiers")
def get_alert_tiers():
    return {"tiers": alert_categorizer.get_all_tiers_summary()}


@router.get("/model")
def model_info():
    if ml_service.model_type != 'pipeline':
        raise HTTPException(503, 'Model unavailable')
    return {**ml_service.metadata, 'input_schema': PredictionRequest.model_json_schema(),
            'tier_policy': 'Display tiers are independent of the learned binary threshold.'}
