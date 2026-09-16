import asyncio
from app.services.radar_service import RadarService

def test_unavailable_radar_has_no_synthetic_tiles():
    result = RadarService()._build_fallback_radar_frames()
    assert result.frames == []
    assert result.latest_frame is None
    assert result.status == 'unavailable'

def test_latest_is_observation_not_future_nowcast():
    result = asyncio.run(RadarService().fetch_radar_frames())
    assert result.latest_frame.time == 90
    assert result.frames[-1].time == 110
    assert result.frames[-1].kind == 'forecast'

def test_cached_frames():
    async def check():
        service = RadarService()
        first = await service.fetch_radar_frames()
        second = await service.fetch_radar_frames()
        assert first == second
        assert '{z}/{x}/{y}' in second.latest_frame.tile_url_template
    asyncio.run(check())
