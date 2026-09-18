from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
import sqlite3

from app.models.weather import DistrictTelemetry
from app.services.history_service import HistoryService, history_service


def test_live_assessment_is_auditable_and_deduplicated(client):
    first = client.get('/api/v1/weather/districts/kalutara').json()
    client.get('/api/v1/weather/districts/kalutara')
    result = client.get('/api/v1/weather/districts/kalutara/history').json()
    assert first['history_status'] == 'recorded'
    assert len(result['entries']) == 1
    saved = result['entries'][0]
    assert saved['inputs'] == first['assessment_inputs']
    assert saved['prediction'] == first['prediction']
    assert saved['observed_at'] == first['observed_at']
    assert len(saved['input_sources']) == 21
    assert saved['input_sources']['distance_to_river_m'] == 'Unverified scenario baseline'
    # An unmodified scenario must reproduce the selected district, not Colombo defaults.
    result = client.post('/api/v1/simulate', json={
        'district': 'kalutara', 'rainfall_7d_mm': first['rain_7d_mm'],
        'rainfall_24h_mm': first['assessment_inputs']['rainfall_24h_mm'],
        'rainfall_30d_mm': first['assessment_inputs']['rainfall_30d_mm'],
        'soil_saturation_pct': first['soil_saturation_pct'],
        'elevation_m': first['assessment_inputs']['elevation_m'],
        'distance_to_river_m': first['assessment_inputs']['distance_to_river_m'],
    }).json()
    assert result['flood_probability'] == first['prediction']['flood_probability']


def test_history_survives_service_restart_and_is_bounded(client, tmp_path):
    reading = DistrictTelemetry(**client.get('/api/v1/weather/districts/colombo').json())
    path = tmp_path / 'bounded.sqlite3'
    service = HistoryService(path, limit=3)
    start = datetime(2026, 9, 16, tzinfo=timezone.utc)
    readings = [reading.model_copy(update={'observed_at': (start + timedelta(hours=i)).isoformat()}) for i in range(5)]
    # Out-of-order arrivals and concurrent duplicate requests must preserve the newest observations.
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(service.record, [*reversed(readings), *readings]))
    saved = HistoryService(path, limit=3).read('colombo')
    assert [entry['observed_at'] for entry in saved] == [r.observed_at for r in readings[-3:]]
    assert service.read('kandy') == []


def test_history_failure_does_not_remove_current_prediction(client):
    with patch.object(history_service, 'record', side_effect=sqlite3.OperationalError('readonly')):
        response = client.get('/api/v1/weather/districts/colombo')
    assert response.status_code == 200
    assert response.json()['prediction'] is not None
    assert response.json()['history_status'] == 'unavailable'
    with patch.object(history_service, 'read', side_effect=sqlite3.OperationalError('readonly')):
        assert client.get('/api/v1/weather/districts/colombo/history').status_code == 503


def test_empty_and_unavailable_assessments_do_not_invent_history(client, monkeypatch):
    from app.services.ml_service import ml_service
    assert client.get('/api/v1/weather/districts/kandy/history').json()['entries'] == []
    monkeypatch.setattr(ml_service, '_pipeline', None)
    assert client.get('/api/v1/weather/districts/kandy').json()['history_status'] == 'not_recorded'
    assert client.get('/api/v1/weather/districts/kandy/history').json()['entries'] == []
    assert client.get('/api/v1/weather/districts/unknown/history').status_code == 404
    assert client.get('/api/v1/weather/districts/kandy/history?limit=289').status_code == 422


def test_extreme_scenario_reports_invalid_derived_rainfall(client):
    assert client.post('/api/v1/simulate', json={'rainfall_7d_mm': 5000, 'rainfall_30d_mm': 4000}).status_code == 422
