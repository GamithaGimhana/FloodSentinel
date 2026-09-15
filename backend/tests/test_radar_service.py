import asyncio
import pytest
from app.services.radar_service import RadarService


def test_fallback_radar_frames():
    service = RadarService()
    fallback_resp = service._build_fallback_radar_frames()

    assert fallback_resp.host == "https://tilecache.rainviewer.com"
    assert len(fallback_resp.frames) == 6
    assert fallback_resp.latest_frame is not None
    # Verify Leaflet URL template format
    latest_tile = fallback_resp.latest_frame.tile_url_template
    assert "{z}/{x}/{y}" in latest_tile
    assert latest_tile.endswith(".png")


def test_fetch_radar_frames_caching():
    service = RadarService()
    # Populate cache directly to verify cached retrieval
    mock_resp = service._build_fallback_radar_frames()
    service._cache["frames"] = mock_resp.model_dump()

    res = asyncio.run(service.fetch_radar_frames())
    assert len(res.frames) == len(mock_resp.frames)
    assert res.host == mock_resp.host
