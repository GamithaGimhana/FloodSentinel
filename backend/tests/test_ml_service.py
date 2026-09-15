import math
import pytest
from app.services.ml_service import MLService, MODEL_FEATURE_ORDER
from app.services.alert_categorizer import AlertCategorizer, alert_categorizer
from app.core.thresholds import ALERT_TIERS, get_alert_tier_by_probability


# ──────────────────────────────────────────────────────────────
# Feature Transformer Tests
# ──────────────────────────────────────────────────────────────

def test_engineered_features_formulas():
    """Verify the 6 engineered features exactly match notebook Step 5 formulas."""
    service = MLService()
    raw = {
        "elevation_m": 10,
        "rainfall_7d_mm": 185.5,
        "monthly_rainfall_mm": 420.0,
        "drainage_index": 0.32,
        "ndvi": 0.28,
        "ndwi": 0.45,
        "distance_to_river_m": 450,
        "population_density_per_km2": 3520,
    }

    features = service.transform_features(raw)

    # Formula 1: rainfall_7d / (elevation + 1)
    expected_stress = round(185.5 / (10 + 1.0), 4)
    assert features.hydrological_stress_index == expected_stress

    # Formula 2: monthly_rainfall / (drainage_index + 0.01)
    expected_drainage = round(420.0 / (0.32 + 0.01), 4)
    assert features.drainage_saturation_ratio == expected_drainage

    # Formula 3: ndwi - ndvi
    expected_contrast = round(0.45 - 0.28, 4)
    assert features.water_veg_contrast == expected_contrast

    # Formula 4: 1000 / (distance_to_river + 1)
    expected_buffer = round(1000.0 / (450 + 1.0), 4)
    assert features.river_proximity_buffer == expected_buffer

    # Formula 5: log(pop_density + 1)
    expected_log_pop = round(math.log(3520 + 1), 4)
    assert features.log_population_density == expected_log_pop

    # Formula 6: (rainfall_7d * ndwi) / (elevation + 1)
    expected_runoff = round((185.5 * 0.45) / (10 + 1.0), 4)
    assert features.runoff_vulnerability == expected_runoff


def test_feature_order_has_18_features():
    """Verify model feature order contains 12 raw + 6 engineered = 18 features."""
    assert len(MODEL_FEATURE_ORDER) == 18


# ──────────────────────────────────────────────────────────────
# Alert Categorizer Tests
# ──────────────────────────────────────────────────────────────

def test_alert_tier_safe():
    result = alert_categorizer.categorize(0.15)
    assert result["alert_level"] == "SAFE"
    assert result["alert_emoji"] == "🟢"
    assert result["risk_score"] == 15


def test_alert_tier_advisory():
    result = alert_categorizer.categorize(0.40)
    assert result["alert_level"] == "ADVISORY"
    assert result["alert_emoji"] == "🟡"
    assert result["risk_score"] == 40


def test_alert_tier_warning():
    result = alert_categorizer.categorize(0.65)
    assert result["alert_level"] == "WARNING"
    assert result["alert_emoji"] == "🟠"
    assert result["risk_score"] == 65


def test_alert_tier_critical():
    result = alert_categorizer.categorize(0.90)
    assert result["alert_level"] == "CRITICAL"
    assert result["alert_emoji"] == "🔴"
    assert result["risk_score"] == 90


def test_alert_tier_boundary_zero():
    result = alert_categorizer.categorize(0.0)
    assert result["alert_level"] == "SAFE"


def test_alert_tier_boundary_one():
    result = alert_categorizer.categorize(1.0)
    assert result["alert_level"] == "CRITICAL"


def test_binary_prediction_below_threshold():
    cat = AlertCategorizer(threshold=0.35)
    result = cat.categorize(0.20)
    assert result["binary_prediction"] == 0


def test_binary_prediction_above_threshold():
    cat = AlertCategorizer(threshold=0.35)
    result = cat.categorize(0.50)
    assert result["binary_prediction"] == 1


def test_get_all_tiers_summary_has_four_tiers():
    tiers = alert_categorizer.get_all_tiers_summary()
    assert len(tiers) == 4
    assert tiers[0]["level"] == "SAFE"
    assert tiers[3]["level"] == "CRITICAL"


# ──────────────────────────────────────────────────────────────
# Heuristic Predictor Tests
# ──────────────────────────────────────────────────────────────

def test_heuristic_high_risk_scenario():
    """Extreme rainfall + low elevation + close to river should produce high probability."""
    service = MLService()
    raw = {
        "latitude": 6.68,
        "longitude": 80.40,
        "elevation_m": 5,
        "distance_to_river_m": 100,
        "rainfall_7d_mm": 280,
        "monthly_rainfall_mm": 650,
        "drainage_index": 0.15,
        "ndvi": 0.18,
        "ndwi": 0.62,
        "population_density_per_km2": 2800,
        "built_up_percent": 45,
        "infrastructure_score": 40,
    }
    prob = service.predict(raw)
    assert prob >= 0.60, f"Expected high risk probability >=0.60, got {prob}"


def test_heuristic_low_risk_scenario():
    """Low rainfall + high elevation + far from river should produce low probability."""
    service = MLService()
    raw = {
        "latitude": 7.29,
        "longitude": 80.63,
        "elevation_m": 450,
        "distance_to_river_m": 4500,
        "rainfall_7d_mm": 12,
        "monthly_rainfall_mm": 45,
        "drainage_index": 0.85,
        "ndvi": 0.72,
        "ndwi": 0.08,
        "population_density_per_km2": 300,
        "built_up_percent": 10,
        "infrastructure_score": 80,
    }
    prob = service.predict(raw)
    assert prob <= 0.30, f"Expected low risk probability <=0.30, got {prob}"


def test_prediction_output_range():
    """Prediction should always be between 0 and 1."""
    service = MLService()
    raw = {
        "elevation_m": 50,
        "distance_to_river_m": 1000,
        "rainfall_7d_mm": 100,
        "monthly_rainfall_mm": 300,
        "drainage_index": 0.5,
        "ndvi": 0.3,
        "ndwi": 0.3,
        "population_density_per_km2": 1000,
    }
    prob = service.predict(raw)
    assert 0.0 <= prob <= 1.0


def test_model_type_defaults_to_heuristic():
    service = MLService()
    assert service.model_type == "heuristic"
