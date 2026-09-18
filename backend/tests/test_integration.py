import asyncio
import json
import math
from unittest.mock import AsyncMock
import httpx
import pytest
from app.services.ml_service import ml_service, MLService, ModelUnavailable
from app.services.weather_service import weather_service
from app.services.emergency_service import EmergencyService, distance_km
from app.api.v1.predict_routes import scenario_input
from app.models.schemas import SimulationRequest


def test_real_artifact_parity_for_both_exported_samples(client):
    info = client.get('/api/v1/model').json()
    assert client.get('/ready').status_code == 200
    for raw in info['sample_payloads'].values():
        response = client.post('/api/v1/predict', json=raw)
        assert response.status_code == 200, response.text
        result = response.json()
        assert result['model_type'] == 'pipeline'
        assert result['flood_probability'] == pytest.approx(float(ml_service._pipeline.predict_proba(raw)[0, 1]))
        assert result['binary_prediction'] == int(ml_service._pipeline.predict(raw)[0])
        assert result['threshold_used'] == info['decision_threshold']
        assert 'Synthetic' in result['data_scope']


@pytest.mark.parametrize('changes', [{'latitude': 90}, {'drainage_index': -1}, {'soil_saturation_index': 2},
    {'historical_flood_count': 1.5}, {'district': 'unknown'}, {'inundation_area_sqm': 100},
    {'nearest_evac_km': -1}, {'electricity': ''}, {'rainfall_24h_mm': -1}])
def test_invalid_and_leakage_fields_rejected(client, payload, changes):
    assert client.post('/api/v1/predict', json={**payload, **changes}).status_code == 422


def test_missing_fields_are_not_silent_assumptions(client, payload):
    del payload['soil_type']
    assert client.post('/api/v1/predict', json=payload).status_code == 422


def test_nan_rejected(client, payload):
    payload['rainfall_7d_mm'] = float('nan')
    response = client.post('/api/v1/predict', content=json.dumps(payload), headers={'content-type': 'application/json'})
    assert response.status_code == 422


def test_batch_and_limits(client, payload):
    data = client.post('/api/v1/predict/batch', json={'locations': [payload, payload]}).json()
    assert data['total'] == 2
    assert data['predictions'][0] == data['predictions'][1]
    for locations in [[], [payload] * 26]:
        assert client.post('/api/v1/predict/batch', json={'locations': locations}).status_code == 422


def test_simulator_uses_full_pipeline_and_explicit_assumptions(client):
    response = client.post('/api/v1/simulate', json={'district': 'colombo', 'rainfall_30d_mm': 80})
    assert response.status_code == 200
    result = response.json()
    raw = scenario_input(SimulationRequest(district='colombo', rainfall_30d_mm=80))
    assert raw['rainfall_30d_mm'] == 80
    assert result['flood_probability'] == ml_service.evaluate(raw).flood_probability
    assert result['assumptions']
    assert client.post('/api/v1/simulate', json={'district': 'unknown'}).status_code == 422


def test_unavailable_model_never_fakes_prediction(client, payload, monkeypatch):
    monkeypatch.setattr(ml_service, '_pipeline', None)
    assert client.post('/api/v1/predict', json=payload).status_code == 503
    assert client.get('/ready').status_code == 503
    weather = client.get('/api/v1/weather/districts/colombo').json()
    assert weather['status'] == 'live'
    assert weather['prediction'] is None


def test_corrupt_or_missing_model_is_not_ready(tmp_path, monkeypatch):
    import app.services.ml_service as module
    monkeypatch.setattr(module, 'MODEL_PKL_PATH', tmp_path / 'missing.pkl')
    service = MLService()
    assert not service.load_pipeline()
    assert service.model_type == 'unavailable'
    with pytest.raises(ModelUnavailable): service.evaluate({})


def test_mismatched_threshold_rejected(tmp_path, monkeypatch):
    import app.services.ml_service as module
    metadata = json.loads(module.MODEL_METADATA_PATH.read_text())
    metadata['decision_threshold'] = .8
    path = tmp_path / 'metadata.json'
    path.write_text(json.dumps(metadata))
    monkeypatch.setattr(module, 'MODEL_METADATA_PATH', path)
    assert not MLService().load_pipeline()


def test_all_districts_use_pipeline(client):
    response = client.get('/api/v1/weather/districts')
    assert response.status_code == 200, response.text
    districts = response.json()['districts']
    assert len(districts) == 25
    assert all(d['prediction']['model_type'] == 'pipeline' for d in districts)
    assert all(d['assumptions'] for d in districts)


def test_single_district_does_not_fetch_all(client, monkeypatch):
    mock = AsyncMock(side_effect=AssertionError('must not fetch all'))
    monkeypatch.setattr(weather_service, 'fetch_districts_weather', mock)
    assert client.get('/api/v1/weather/districts/colombo').status_code == 200
    assert client.get('/api/v1/weather/districts/unknown').status_code == 404
    mock.assert_not_awaited()


def test_emergency_sorting_and_limits(client):
    response = client.get('/api/v1/emergency/nearby?lat=6.9271&lon=79.8612')
    assert response.status_code == 200
    resources = response.json()['facilities']
    assert len(resources) == 2
    assert resources[0]['distance_km'] <= resources[1]['distance_km']
    assert all(r['activation_status'] == 'unverified' for r in resources)
    assert client.get('/api/v1/emergency/nearby?lat=90&lon=0').status_code == 422
    assert client.get('/api/v1/emergency/nearby?lat=7&lon=80&radius_km=1000').status_code == 422


def test_facilities_failure_retains_contacts():
    client = AsyncMock()
    client.post.side_effect = httpx.ConnectError('offline')
    result = asyncio.run(EmergencyService().nearby(7, 80, 15, client))
    assert result['status'] == 'unavailable'
    assert result['facilities'] == []
    assert result['contacts'][0]['phone'] == '117'
    assert distance_km(7, 80, 7, 80) == 0
    assert distance_km(0, 0, 1, 0) == pytest.approx(111.195, abs=.01)


def test_rate_limit(client):
    for _ in range(120):
        assert client.get('/api/v1/alert-tiers').status_code == 200
    response = client.get('/api/v1/alert-tiers')
    assert response.status_code == 429
    assert response.headers['retry-after'] == '60'
    assert client.get('/health').status_code == 200
