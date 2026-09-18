from datetime import datetime, timezone
from starlette.concurrency import run_in_threadpool
from app.models.schemas import ForecastRequest, ForecastResponse, ForecastDay
from app.services.weather_service import weather_service
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
        rainfall_24h_mm=request.rainfall_24h_mm if request.rainfall_24h_mm is not None else request.rainfall_7d_mm / 7,
        rainfall_30d_mm=request.rainfall_30d_mm if request.rainfall_30d_mm is not None else request.rainfall_7d_mm,
        height_above_nearest_drainage_m=request.height_above_nearest_drainage_m,
        drainage_index=request.drainage_index,
        soil_saturation_index=request.soil_saturation_pct / 100)


# Sync handlers run in FastAPI's worker pool so CPU inference does not block I/O.
@router.post("/predict", response_model=PredictionResponse)
def predict_flood_risk(request: PredictionRequest):
    return ml_service.evaluate(request.model_dump())

@router.post("/simulate", response_model=SimulationResponse)
def simulate_flood_scenario(request: SimulationRequest):
    try:
        raw = scenario_input(request)
    except ValueError as exc:
        raise HTTPException(422, 'Derived scenario inputs exceed the model input range. Check 24h <= 7d <= 30d rainfall.') from exc
    result = ml_service.evaluate(raw)
    return SimulationResponse(**result.model_dump(), scenario_inputs={
        "rainfall_7d_mm": request.rainfall_7d_mm,
        "distance_to_river_m": request.distance_to_river_m,
        "elevation_m": request.elevation_m,
        "soil_saturation_pct": request.soil_saturation_pct,
    }, assumptions=ASSUMPTIONS + ['Scenario defaults: 24h rainfall = 7d / 7, 30d rainfall = 7d unless supplied. These are assumptions, not weather readings.'])

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

@router.post('/forecast', response_model=ForecastResponse)
async def forecast_scenarios(request: ForecastRequest):
    weather = await weather_service.fetch_live_weather(request.latitude, request.longitude)
    if weather.status != 'live' or not weather.forecast:
        raise HTTPException(503, 'Complete weather forecast unavailable; no substitute projection was generated.')
    days = []
    for day in weather.forecast[:request.days]:
        try:
            raw = PredictionRequest(**{**request.site.model_dump(), **day.model_dump(exclude={'date'})})
        except ValueError as exc:
            raise HTTPException(422, 'Forecast weather exceeds the model input contract.') from exc
        prediction = await run_in_threadpool(ml_service.evaluate, raw.model_dump())
        days.append(ForecastDay(valid_date=day.date, inputs=raw, prediction=prediction))
    return ForecastResponse(generated_at=datetime.now(timezone.utc).isoformat(),
        weather_reference_time=weather.current.time, latitude=request.latitude, longitude=request.longitude,
        assumptions=ASSUMPTIONS + [
            'Supplied site conditions are held fixed; rainfall windows include forecast precipitation through each valid date.',
            'Soil saturation uses the daily mean of forecast surface moisture. This differs from the synthetic antecedent-wetness definition.',
            'The model has no future-event training labels; projection uncertainty is not quantified.'], days=days)
