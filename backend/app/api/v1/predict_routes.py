from fastapi import APIRouter
from typing import Dict, Any

from app.models.schemas import (
    PredictionRequest,
    PredictionResponse,
    SimulationRequest,
    SimulationResponse,
    BatchPredictionRequest,
    BatchPredictionResponse,
)
from app.services.ml_service import ml_service
from app.services.alert_categorizer import alert_categorizer

router = APIRouter()


@router.post(
    "/predict",
    response_model=PredictionResponse,
    summary="Predict flood probability for a specific location",
    description=(
        "Accepts raw geospatial and meteorological features, computes 6 domain-engineered "
        "features, runs ML inference (pipeline or heuristic fallback), and returns "
        "calibrated flood probability with 4-tier DMC alert categorization."
    ),
)
async def predict_flood_risk(request: PredictionRequest):
    raw_input = request.model_dump()

    # Compute engineered features
    engineered = ml_service.transform_features(raw_input)

    # Run prediction
    probability = ml_service.predict(raw_input)

    # Categorize alert
    alert = alert_categorizer.categorize(probability)

    return PredictionResponse(
        flood_probability=round(probability, 4),
        binary_prediction=alert["binary_prediction"],
        risk_score=alert["risk_score"],
        alert_level=alert["alert_level"],
        alert_emoji=alert["alert_emoji"],
        alert_color=alert["alert_color"],
        recommended_action=alert["recommended_action"],
        engineered_features=engineered,
        model_type=ml_service.model_type,
        threshold_used=ml_service.threshold,
    )


@router.post(
    "/simulate",
    response_model=SimulationResponse,
    summary="Run What-If flood scenario simulation",
    description=(
        "Accepts simplified slider inputs (rainfall, river proximity, elevation, "
        "soil saturation) from the frontend ScenarioSliders component. Missing features "
        "are filled with typical Sri Lankan wet-zone baseline values."
    ),
)
async def simulate_flood_scenario(request: SimulationRequest):
    # Fill missing features with typical wet-zone Sri Lanka baselines
    raw_input = {
        "latitude": 6.9271,
        "longitude": 79.8612,
        "elevation_m": request.elevation_m,
        "distance_to_river_m": request.distance_to_river_m,
        "rainfall_7d_mm": request.rainfall_7d_mm,
        "monthly_rainfall_mm": request.monthly_rainfall_mm or (request.rainfall_7d_mm * 3.5),
        "drainage_index": max(0.01, 1.0 - (request.soil_saturation_pct / 100.0)),
        "ndvi": request.ndvi if request.ndvi is not None else 0.32,
        "ndwi": request.ndwi if request.ndwi is not None else (0.15 + request.soil_saturation_pct * 0.005),
        "population_density_per_km2": 1500,
        "built_up_percent": 35.0,
        "infrastructure_score": 55.0,
        "electricity": "Grid",
    }

    engineered = ml_service.transform_features(raw_input)
    probability = ml_service.predict(raw_input)
    alert = alert_categorizer.categorize(probability)

    return SimulationResponse(
        flood_probability=round(probability, 4),
        binary_prediction=alert["binary_prediction"],
        risk_score=alert["risk_score"],
        alert_level=alert["alert_level"],
        alert_emoji=alert["alert_emoji"],
        alert_color=alert["alert_color"],
        recommended_action=alert["recommended_action"],
        engineered_features=engineered,
        scenario_inputs={
            "rainfall_7d_mm": request.rainfall_7d_mm,
            "distance_to_river_m": request.distance_to_river_m,
            "elevation_m": request.elevation_m,
            "soil_saturation_pct": request.soil_saturation_pct,
        },
    )


@router.post(
    "/predict/batch",
    response_model=BatchPredictionResponse,
    summary="Batch flood prediction for multiple locations",
    description="Accepts up to 25 locations and returns predictions for all of them.",
)
async def batch_predict(request: BatchPredictionRequest):
    results = []
    for loc in request.locations:
        raw_input = loc.model_dump()
        engineered = ml_service.transform_features(raw_input)
        probability = ml_service.predict(raw_input)
        alert = alert_categorizer.categorize(probability)

        results.append(
            PredictionResponse(
                flood_probability=round(probability, 4),
                binary_prediction=alert["binary_prediction"],
                risk_score=alert["risk_score"],
                alert_level=alert["alert_level"],
                alert_emoji=alert["alert_emoji"],
                alert_color=alert["alert_color"],
                recommended_action=alert["recommended_action"],
                engineered_features=engineered,
                model_type=ml_service.model_type,
                threshold_used=ml_service.threshold,
            )
        )

    return BatchPredictionResponse(total=len(results), predictions=results)


@router.get(
    "/alert-tiers",
    summary="Get all alert tier definitions",
    description="Returns the 4-tier DMC alert level boundaries and recommended actions.",
)
async def get_alert_tiers():
    return {"tiers": alert_categorizer.get_all_tiers_summary()}
