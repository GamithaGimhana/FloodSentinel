import asyncio
from unittest.mock import AsyncMock
import numpy as np
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.ml_service import MLService, MODEL_FEATURE_ORDER
from app.services.weather_service import weather_service
from app.services.alert_categorizer import AlertCategorizer
from app.api.v1.predict_routes import scenario_input
from app.models.schemas import SimulationRequest

@pytest.mark.parametrize('value,level', [(0,'SAFE'),(.25,'SAFE'),(.2501,'ADVISORY'),(.5,'ADVISORY'),(.5001,'WARNING'),(.75,'WARNING'),(.7501,'CRITICAL'),(1,'CRITICAL')])
def test_continuous_tier_boundaries(value, level):
    assert AlertCategorizer().categorize(value)['alert_level'] == level

def test_monthly_zero_is_preserved():
    assert scenario_input(SimulationRequest(monthly_rainfall_mm=0))['monthly_rainfall_mm'] == 0

@pytest.mark.parametrize('payload', [{'monthly_rainfall_mm':-1e308}, {'ndwi':2}, {'ndvi':-2}, {'soil_saturation_pct':101}, {'district':'unknown'}])
def test_invalid_scenarios_rejected(payload):
    with TestClient(app) as client:
        assert client.post('/api/v1/simulate',json=payload).status_code == 422

class Pipeline:
    classes_ = np.array([1, 0])
    def predict_proba(self, data): return np.array([[.5, .5]])

def test_metadata_threshold_and_positive_class_are_used():
    service = MLService()
    service._pipeline = Pipeline()
    service._threshold = .8
    raw = {name: 1 for name in MODEL_FEATURE_ORDER}
    result = service.evaluate(raw)
    assert result.threshold_used == .8
    assert result.binary_prediction == 0
    assert result.model_type == 'pipeline'

def test_failed_pipeline_response_has_actual_source():
    class Broken(Pipeline):
        def predict_proba(self,data): raise ValueError('failure')
    service = MLService()
    service._pipeline = Broken()
    service._threshold = .8
    result = service.evaluate({name: 1 for name in MODEL_FEATURE_ORDER})
    assert result.model_type == 'heuristic'
    assert result.threshold_used == .35

def test_invalid_district_does_not_query_provider(monkeypatch):
    mock = AsyncMock()
    monkeypatch.setattr(weather_service, 'fetch_district_weather', mock)
    with TestClient(app) as client:
        assert client.get('/api/v1/weather/districts/not-real').status_code == 404
    mock.assert_not_awaited()

def test_single_district_does_not_fetch_all(monkeypatch):
    mock = AsyncMock(side_effect=AssertionError('must not fetch all'))
    monkeypatch.setattr(weather_service, 'fetch_districts_weather', mock)
    with TestClient(app) as client:
        result = client.get('/api/v1/weather/districts/colombo')
        assert result.status_code == 200
        assert result.json()['prediction']['model_type'] == 'heuristic'
    mock.assert_not_awaited()

def test_batch_limits_and_simulation_provenance():
    with TestClient(app) as client:
        assert client.post('/api/v1/predict/batch', json={'locations':[]}).status_code == 422
        result = client.post('/api/v1/simulate', json={}).json()
        assert result['model_type'] == 'heuristic'
        assert result['assumptions']
        assert 'threshold_used' in result

def test_startup_load_and_shutdown_close_client(monkeypatch):
    from app.services.ml_service import ml_service
    monkeypatch.setattr(ml_service, 'load_pipeline', lambda: False)
    with TestClient(app):
        client = weather_service.client
        assert client is not None
    assert client.is_closed
    assert weather_service.client is None
