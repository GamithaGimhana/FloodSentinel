"""Nearby mapped facilities, never a claim of shelter activation or road safety."""
import asyncio
import math
import logging
import os
from datetime import datetime, timezone
from urllib.parse import urlencode
import httpx
from cachetools import TTLCache


def distance_km(lat1, lon1, lat2, lon2):
    a, b = math.radians(lat1), math.radians(lat2)
    h = math.sin((b-a)/2)**2 + math.cos(a)*math.cos(b)*math.sin(math.radians(lon2-lon1)/2)**2
    return 6371.0088 * 2 * math.asin(min(1, math.sqrt(h)))


class EmergencyService:
    def __init__(self):
        self.cache = TTLCache(maxsize=128, ttl=1800)
        self.failures = TTLCache(maxsize=128, ttl=60)
        self.lock = asyncio.Lock()

    async def nearby(self, lat, lon, radius_km, client):
        key = (round(lat, 3), round(lon, 3), radius_km)
        async with self.lock:
            if key in self.cache:
                return self.cache[key]
            if key in self.failures:
                return self.failures[key]
            radius = radius_km * 1000
            query = f'''[out:json][timeout:15];(
                nwr[amenity=hospital](around:{radius},{lat},{lon});
                nwr[emergency=assembly_point](around:{radius},{lat},{lon});
                nwr[social_facility=shelter](around:{radius},{lat},{lon});
                );out center tags 100;'''
            result = {'status': 'live', 'source': 'OpenStreetMap contributors / Overpass',
                      'checked_at': datetime.now(timezone.utc).isoformat(), 'facilities': [],
                      'notice': 'Community-mapped facilities. Opening, capacity and flood suitability are unverified. Distances are straight-line, not safe evacuation routes. Confirm with DMC 117.',
                      'contacts': [{'name': 'Disaster Management Centre', 'phone': '117', 'url': 'https://117.dmc.gov.lk/'},
                                   {'name': 'Suwa Seriya ambulance', 'phone': '1990', 'url': 'https://www.1990.lk/'}]}
            try:
                response = await client.post(os.getenv('OVERPASS_BASE_URL', 'https://overpass-api.de/api/interpreter'), data={'data': query}, headers={'User-Agent': 'FloodSentinel/1.1 (academic flood risk dashboard)'}, timeout=20)
                response.raise_for_status()
                for item in response.json()['elements']:
                    point = item.get('center', item)
                    plat, plon = float(point['lat']), float(point['lon'])
                    if not math.isfinite(plat) or not math.isfinite(plon):
                        continue
                    dist = distance_km(lat, lon, plat, plon)
                    if dist > radius_km:
                        continue
                    tags = item.get('tags', {})
                    kind = 'hospital' if tags.get('amenity') == 'hospital' else 'assembly point' if tags.get('emergency') == 'assembly_point' else 'shelter'
                    result['facilities'].append({'id': f"{item['type']}/{item['id']}",
                        'name': tags.get('name:en') or tags.get('name') or f'Mapped {kind}',
                        'kind': kind, 'latitude': plat, 'longitude': plon, 'distance_km': round(dist, 2),
                        'osm_url': f"https://www.openstreetmap.org/{item['type']}/{int(item['id'])}",
                        'directions_url': 'https://www.google.com/maps/dir/?' + urlencode({'api': 1, 'origin': f'{lat},{lon}', 'destination': f'{plat},{plon}'}),
                        'activation_status': 'unverified'})
                result['facilities'].sort(key=lambda f: f['distance_km'])
                result['facilities'] = result['facilities'][:20]
                self.cache[key] = result
            except (httpx.HTTPError, ValueError, KeyError, TypeError) as exc:
                logging.getLogger(__name__).warning('Facility provider unavailable: %s', exc)
                result['status'] = 'unavailable'
                result['facilities'] = []
                result['notice'] = 'Facility lookup is unavailable. Contact DMC 117 for currently designated shelters.'
                self.failures[key] = result
            return result

emergency_service = EmergencyService()
