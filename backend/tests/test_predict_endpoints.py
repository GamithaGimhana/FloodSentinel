from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_predict_endpoint_valid_request():
    """POST /api/v1/predict with valid Colombo coordinates should return 200."""
    payload = {
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
    }
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "flood_probability" in data
    assert 0.0 <= data["flood_probability"] <= 1.0
    assert data["alert_level"] in ["SAFE", "ADVISORY", "WARNING", "CRITICAL"]
    assert "engineered_features" in data
    assert "hydrological_stress_index" in data["engineered_features"]


def test_predict_endpoint_invalid_coordinates():
    """POST /api/v1/predict with out-of-bounds coordinates should return 422."""
    payload = {
        "latitude": 45.0,
        "longitude": 12.0,
        "elevation_m": 10,
        "distance_to_river_m": 450,
        "rainfall_7d_mm": 100,
        "monthly_rainfall_mm": 200,
        "drainage_index": 0.5,
        "ndvi": 0.3,
        "ndwi": 0.3,
        "population_density_per_km2": 500,
    }
    response = client.post("/api/v1/predict", json=payload)
    assert response.status_code == 422


def test_simulate_endpoint():
    """POST /api/v1/simulate with slider values should return 200."""
    payload = {
        "rainfall_7d_mm": 250,
        "distance_to_river_m": 200,
        "elevation_m": 15,
        "soil_saturation_pct": 85,
    }
    response = client.post("/api/v1/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "flood_probability" in data
    assert "scenario_inputs" in data
    assert data["scenario_inputs"]["rainfall_7d_mm"] == 250
    assert data["alert_level"] in ["SAFE", "ADVISORY", "WARNING", "CRITICAL"]


def test_alert_tiers_endpoint():
    """GET /api/v1/alert-tiers should return 4 tiers."""
    response = client.get("/api/v1/alert-tiers")
    assert response.status_code == 200
    data = response.json()
    assert len(data["tiers"]) == 4
    assert data["tiers"][0]["level"] == "SAFE"
    assert data["tiers"][3]["level"] == "CRITICAL"


def test_health_includes_ml_model_type():
    """GET /health should include ml_model_type field."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "ml_model_type" in data
    assert data["ml_model_type"] in ["heuristic", "pipeline"]
