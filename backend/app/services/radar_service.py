import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import httpx
from cachetools import TTLCache

from app.core.config import settings
from app.models.weather import RadarFrame, RadarFramesResponse

logger = logging.getLogger(__name__)


class RadarService:
    """Asynchronous service for querying and caching RainViewer Doppler radar frames for Sri Lanka."""

    def __init__(self):
        self._cache = TTLCache(maxsize=5, ttl=settings.RADAR_CACHE_TTL_SECONDS)

    async def fetch_radar_frames(self) -> RadarFramesResponse:
        """Fetches active radar frame timestamps and constructs Leaflet tile URLs."""
        if "frames" in self._cache:
            return RadarFramesResponse(**self._cache["frames"])

        url = settings.RAINVIEWER_BASE_URL
        try:
            async with httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT_SECONDS) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()

            host = data.get("host", "https://tilecache.rainviewer.com")
            gen_time = data.get("generated", int(datetime.now(timezone.utc).timestamp()))
            radar_dict = data.get("radar", {})

            raw_frames: List[Dict[str, Any]] = []
            # Past scans (usually 10-12 frames covering past 2 hours)
            raw_frames.extend(radar_dict.get("past", []))
            # Nowcast forecasts (usually next 30-45 mins)
            raw_frames.extend(radar_dict.get("nowcast", []))

            parsed_frames: List[RadarFrame] = []
            for item in raw_frames:
                epoch_time = item.get("time")
                path = item.get("path")
                if not epoch_time or not path:
                    continue

                iso_time = datetime.fromtimestamp(epoch_time, tz=timezone.utc).isoformat()
                # 256px tile, color scheme 2 (Universal Blue), smooth 1, snow 1
                tile_template = f"{host}{path}/256/{{z}}/{{x}}/{{y}}/2/1_1.png"

                parsed_frames.append(
                    RadarFrame(
                        time=epoch_time,
                        path=path,
                        tile_url_template=tile_template,
                        iso_timestamp=iso_time
                    )
                )

            # Sort chronologically
            parsed_frames.sort(key=lambda f: f.time)
            latest = parsed_frames[-1] if parsed_frames else None

            response = RadarFramesResponse(
                host=host,
                generated_at=gen_time,
                frames=parsed_frames,
                latest_frame=latest
            )

            self._cache["frames"] = response.model_dump()
            return response

        except Exception as exc:
            logger.warning(f"Failed fetching RainViewer radar frames: {exc}. Generating fallback frames.")
            return self._build_fallback_radar_frames()

    def _build_fallback_radar_frames(self) -> RadarFramesResponse:
        """Fallback radar response if RainViewer is unreachable."""
        now_ts = int(datetime.now(timezone.utc).timestamp())
        host = "https://tilecache.rainviewer.com"
        frames: List[RadarFrame] = []

        # Generate 6 synthetic 10-minute intervals
        for offset_min in range(-50, 10, 10):
            ts = now_ts + (offset_min * 60)
            iso = datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
            path = f"/v2/radar/{ts}"
            frames.append(
                RadarFrame(
                    time=ts,
                    path=path,
                    tile_url_template=f"{host}{path}/256/{{z}}/{{x}}/{{y}}/2/1_1.png",
                    iso_timestamp=iso
                )
            )

        return RadarFramesResponse(
            host=host,
            generated_at=now_ts,
            frames=frames,
            latest_frame=frames[-1] if frames else None
        )


radar_service = RadarService()
