"""Deterministic provider fixtures. Tests never contact weather/radar services."""
import httpx
import pytest
from app.services.weather_service import weather_service
from app.services.radar_service import radar_service
from app.main import _request_windows

@pytest.fixture
def weather_payload():
    return {
        "elevation": 10,
        "current": {"time": "2026-09-16T12:15", "interval": 900, "temperature_2m": 28,
                    "precipitation": .5, "weather_code": 61, "wind_speed_10m": 12},
        "daily": {"time": [f"2026-09-{i:02}" for i in range(9, 18)],
                  "precipitation_sum": [1, 2, 3, 4, 5, 6, 7, 999, 999]},
        "hourly": {"time": ["2026-09-16T11:00", "2026-09-16T12:00", "2026-09-16T13:00"],
                   "soil_moisture_0_to_7cm": [.1, .225, .45]},
    }

@pytest.fixture(autouse=True)
def no_external_network(monkeypatch, weather_payload):
    weather_service.__init__()
    radar_service.__init__()
    _request_windows.clear()
    async def get(client, url, **kwargs):
        data = weather_payload if "open-meteo" in str(url) else {
            "host": "https://tilecache.rainviewer.com", "generated": 100,
            "radar": {"past": [{"time": 90, "path": "/v2/radar/90"}],
                      "nowcast": [{"time": 110, "path": "/v2/radar/110"}]},
        }
        return httpx.Response(200, json=data, request=httpx.Request("GET", url))
    monkeypatch.setattr(httpx.AsyncClient, "get", get)

    async def post(client, url, **kwargs):
        return httpx.Response(200, json={'elements': [
            {'type': 'node', 'id': 123, 'lat': 6.928, 'lon': 79.862,
             'tags': {'amenity': 'hospital', 'name': 'Test Hospital'}},
            {'type': 'way', 'id': 124, 'center': {'lat': 6.93, 'lon': 79.86},
             'tags': {'emergency': 'assembly_point', 'name': 'Test Assembly'}}
        ]}, request=httpx.Request('POST', url))
    monkeypatch.setattr(httpx.AsyncClient, 'post', post)
    from app.services.emergency_service import emergency_service
    emergency_service.__init__()

@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as client:
        yield client

@pytest.fixture
def payload():
    import json
    from app.services.ml_service import MODEL_METADATA_PATH
    return json.loads(MODEL_METADATA_PATH.read_text())['sample_payloads']['high_risk_flood']
