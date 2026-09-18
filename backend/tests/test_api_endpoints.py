from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["ready", "degraded"]
    assert data["district_coverage"] == 25


def test_radar_frames_endpoint():
    response = client.get("/api/v1/radar/frames")
    assert response.status_code == 200
    data = response.json()
    assert "host" in data
    assert "frames" in data
    assert isinstance(data["frames"], list)


def test_single_district_not_found():
    response = client.get("/api/v1/weather/districts/non-existent-district")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_weather_live_boundary_validation():
    # Valid coordinates inside Sri Lanka
    response = client.get("/api/v1/weather/live?lat=6.9271&lon=79.8612")
    assert response.status_code == 200
    data = response.json()
    assert "current" in data
    assert "daily" in data
    assert "soil" in data

    # Coordinate outside Sri Lanka bounding box should fail 422 validation
    invalid_resp = client.get("/api/v1/weather/live?lat=45.0&lon=12.0")
    assert invalid_resp.status_code == 422
