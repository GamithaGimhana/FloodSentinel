# 🌦️ Live Weather, Radar & Emergency Facilities Service Branch (`feature/weather-service`)

This branch contains the real-time meteorological ingestion, Doppler radar frame manager, emergency facility lookup, and persistent assessment history service for **FloodSentinel**.

---

## 🎯 Branch Purpose
Responsible for integrating live, open meteorological APIs (Open-Meteo) and Doppler radar feeds (RainViewer) with resilient in-memory caching and request deduplication, providing nearby emergency shelters and hospital discovery via the OpenStreetMap Overpass API, and maintaining an auditable, persistent district assessment history database.

---

## 📡 Integrated Meteorological & Geospatial APIs

### 1. Open-Meteo Weather API
- **Endpoint**: `https://api.open-meteo.com/v1/forecast`
- **Telemetry Ingested**:
  - `precipitation` (current mm/h rate)
  - `precipitation_sum` (strictly past 7 completed days cumulative rainfall, excluding today's partial interval)
  - `temperature_2m` (°C)
  - `soil_moisture_0_to_7cm` (m³/m³ proxy for surface saturation)
- **Features**: Connection pooling, 10-minute success TTL cache, and per-coordinate deduplication.
- **Coverage**: All 25 Sri Lankan administrative districts and point coordinates.

### 2. RainViewer Doppler Radar API
- **Endpoint**: `https://api.rainviewer.com/public/weather-maps.json`
- **Purpose**: Fetches real-time radar coverage frames and generates timestamped Doppler tile URLs for Leaflet animated playback.

### 3. OpenStreetMap Overpass API
- **Endpoint**: `https://overpass-api.de/api/interpreter`
- **Purpose**: Queries verified hospitals, emergency assembly points, and shelter facilities within a 1–30 km search radius, ranked by straight-line distance.

---

## 💾 Persistent District Assessment History Service
- **Storage Engine**: SQLite (`runtime/assessments.sqlite3`), configurable via `HISTORY_DB_PATH`.
- **Deduplication**: Hashes observation payloads to avoid duplicate records on rapid re-queries.
- **Retention**: Strictly bounded to the latest 288 records per district (FIFO cleanup).
- **Graceful Degradation**: Storage failures leave live weather and inference functional while returning explicit HTTP 503 status for history queries.

---

## 🔌 API Endpoints Exposed

- `GET /api/v1/weather/live?lat={lat}&lon={lon}` - Real-time point weather estimates.
- `GET /api/v1/weather/districts` - Baseline weather telemetry across all 25 Sri Lankan districts.
- `GET /api/v1/weather/districts/{district_id}` - Weather telemetry for a specific district.
- `GET /api/v1/weather/districts/{district_id}/history?limit={limit}` - Chronological assessment history (limit: 1–288 records).
- `GET /api/v1/radar/frames` - Timestamped Doppler radar tile frames and playback intervals.
- `GET /api/v1/emergency/nearby?lat={lat}&lon={lon}&radius_km={radius}` - Nearby hospitals and emergency shelters.
