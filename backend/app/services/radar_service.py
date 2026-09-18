import asyncio
import logging
from datetime import datetime, timezone
from urllib.parse import urlparse
import httpx
from cachetools import TTLCache
from app.core.config import settings
from app.models.weather import RadarFrame, RadarFramesResponse

logger = logging.getLogger(__name__)

class RadarService:
    def __init__(self):
        self._cache = TTLCache(maxsize=1, ttl=settings.RADAR_CACHE_TTL_SECONDS)
        self._failures = TTLCache(maxsize=1, ttl=30)
        self._lock = asyncio.Lock()
        self.client = None

    async def fetch_radar_frames(self):
        async with self._lock:
            if "frames" in self._cache:
                return RadarFramesResponse(**self._cache["frames"])
            if "frames" in self._failures:
                return self._build_fallback_radar_frames()
            owned = self.client is None
            client = self.client or httpx.AsyncClient(timeout=settings.HTTP_TIMEOUT_SECONDS)
            try:
                response = await client.get(settings.RAINVIEWER_BASE_URL)
                response.raise_for_status()
                data = response.json()
                host = data["host"].rstrip("/")
                url = urlparse(host)
                if url.scheme != "https" or not (url.hostname or "").endswith(".rainviewer.com"):
                    raise ValueError("Unexpected radar tile host")
                frames = []
                for key, kind in [("past", "observed"), ("nowcast", "forecast")]:
                    for item in data.get("radar", {}).get(key, []):
                        ts, path = int(item["time"]), item["path"]
                        if not path.startswith("/v2/radar/"):
                            raise ValueError("Unexpected radar path")
                        frames.append(RadarFrame(time=ts, path=path, kind=kind,
                            tile_url_template=f"{host}{path}/256/{{z}}/{{x}}/{{y}}/2/1_1.png",
                            iso_timestamp=datetime.fromtimestamp(ts, timezone.utc).isoformat()))
                frames.sort(key=lambda f: f.time)
                if not frames:
                    raise ValueError("No radar frames available")
                observed = [f for f in frames if f.kind == "observed"]
                result = RadarFramesResponse(host=host, generated_at=int(data["generated"]), frames=frames,
                                              latest_frame=observed[-1] if observed else None)
                self._cache["frames"] = result.model_dump()
                return result
            except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
                logger.warning("Radar unavailable: %s", exc)
                self._failures["frames"] = True
                return self._build_fallback_radar_frames()
            finally:
                if owned:
                    await client.aclose()

    def _build_fallback_radar_frames(self):
        return RadarFramesResponse(host="https://tilecache.rainviewer.com", generated_at=0, frames=[],
                                   status="unavailable", message="Radar unavailable. No synthetic frames are generated.")

radar_service = RadarService()
