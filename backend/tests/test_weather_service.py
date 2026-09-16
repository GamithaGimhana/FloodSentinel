import asyncio
from unittest.mock import AsyncMock
import httpx
import pytest
from app.services.weather_service import WeatherService
from app.data.districts_geo import SRI_LANKA_DISTRICTS

def test_complete_historical_days_and_current_soil(weather_payload):
    result = WeatherService()._parse(weather_payload, 6.9, 79.9)
    assert result.daily.precipitation_sum_7d == 28
    assert result.daily.max_daily_rainfall == 7
    assert result.daily.dates[-1] == "2026-09-15"
    assert result.soil.saturation_pct == 50
    assert result.current.precipitation == 2  # .5 mm in 15 minutes = 2 mm/hour
    assert result.current.time.endswith("+05:30")

def test_missing_data_is_not_silently_zero(weather_payload):
    weather_payload["daily"]["precipitation_sum"][0] = None
    with pytest.raises((ValueError, TypeError)):
        WeatherService()._parse(weather_payload, 6.9, 79.9)

def test_no_future_soil_substitution(weather_payload):
    weather_payload["hourly"] = {"time": ["2026-09-17T12:00"], "soil_moisture_0_to_7cm": [.45]}
    with pytest.raises(ValueError):
        WeatherService()._parse(weather_payload, 6.9, 79.9)

def test_unavailable_contains_no_invented_data():
    result = WeatherService()._build_fallback_weather(9, 81)
    assert result.status == "unavailable"
    assert result.current is result.daily is result.soil is None

def test_failed_provider_is_explicitly_unavailable():
    client = AsyncMock()
    client.get.side_effect = httpx.ConnectError("offline")
    result = asyncio.run(WeatherService().fetch_live_weather(6.9, 79.9, client))
    assert result.status == "unavailable"

def test_cache_deduplicates_concurrent_requests(weather_payload):
    async def check():
        client = AsyncMock()
        client.get.return_value = httpx.Response(200, json=weather_payload, request=httpx.Request("GET", "https://example.test"))
        service = WeatherService()
        results = await asyncio.gather(*(service.fetch_live_weather(6.9, 79.9, client) for _ in range(5)))
        assert client.get.await_count == 1
        assert sum(r.cached for r in results) == 4
    asyncio.run(check())

def test_all_25_districts_present_and_unique():
    assert len(SRI_LANKA_DISTRICTS) == 25
    assert len({d['id'] for d in SRI_LANKA_DISTRICTS}) == 25
    assert all(d['baseRisk'] in ['Safe', 'Advisory', 'Warning', 'Critical'] for d in SRI_LANKA_DISTRICTS)
    assert 'nuwara-eliya' in {d['id'] for d in SRI_LANKA_DISTRICTS}

def test_soil_saturation():
    service = WeatherService()
    assert service._calc_soil_saturation(0) == 0
    assert service._calc_soil_saturation(.225) == 50
    assert service._calc_soil_saturation(.45) == 100
