import pytest
from app.services.weather_service import WeatherService, WMO_CODE_MAP
from app.data.districts_geo import SRI_LANKA_DISTRICTS


def test_wmo_code_decoding():
    service = WeatherService()
    assert service._decode_wmo(0) == "Clear sky"
    assert service._decode_wmo(65) == "Heavy rain"
    assert service._decode_wmo(95) == "Thunderstorm with rain"
    assert "999" in service._decode_wmo(999)


def test_soil_saturation_calculation():
    service = WeatherService()
    # At 0.45 m3/m3, saturation is 100%
    assert service._calc_soil_saturation(0.45) == 100.0
    # At 0.225 m3/m3, saturation is 50%
    assert service._calc_soil_saturation(0.225) == 50.0
    # Low or zero moisture clamped to minimum 5-10%
    assert service._calc_soil_saturation(0.0) == 10.0


def test_risk_tier_and_score():
    service = WeatherService()
    # Extreme conditions -> CRITICAL
    tier, score = service._calc_risk_tier_and_score(
        rain_7d=280.0, rain_current=45.0, soil_sat=95.0, base_vuln=0.9
    )
    assert tier == "CRITICAL"
    assert score >= 0.76

    # Normal dry conditions -> SAFE
    tier_safe, score_safe = service._calc_risk_tier_and_score(
        rain_7d=15.0, rain_current=0.0, soil_sat=20.0, base_vuln=0.3
    )
    assert tier_safe == "SAFE"
    assert score_safe <= 0.25


def test_fallback_weather_structure():
    service = WeatherService()
    colombo_lat, colombo_lon = 6.9271, 79.8612
    fallback = service._build_fallback_weather(colombo_lat, colombo_lon)

    assert fallback.latitude == colombo_lat
    assert fallback.longitude == colombo_lon
    assert fallback.current.temperature_2m > 0
    assert fallback.daily.precipitation_sum_7d > 0
    assert fallback.soil.saturation_pct > 0


def test_all_25_districts_present():
    assert len(SRI_LANKA_DISTRICTS) == 25
    district_ids = [d["id"] for d in SRI_LANKA_DISTRICTS]
    assert "colombo" in district_ids
    assert "ratnapura" in district_ids
    assert "kandy" in district_ids
    assert "galle" in district_ids
    assert "jaffna" in district_ids
    assert "batticaloa" in district_ids
