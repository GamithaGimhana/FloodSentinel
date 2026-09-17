# 🌦️ Live Weather, Radar & Emergency Facilities Service Branch (`feature/weather-service`)

This branch contains the real-time meteorological ingestion, Doppler radar frame manager, and emergency facility lookup service for **FloodSentinel**.

---

## 🎯 Branch Purpose
Primary Owner: **Member 1** (Data Engineering & Weather Service Lead)

Responsible for integrating live, open meteorological APIs (Open-Meteo) and Doppler radar feeds (RainViewer) with resilient in-memory caching and request deduplication, as well as providing nearby emergency shelters and hospital discovery via the OpenStreetMap Overpass API.

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

## 🔌 API Endpoints Exposed

- `GET /api/v1/weather/live?lat={lat}&lon={lon}` - Real-time point weather estimates.
- `GET /api/v1/weather/districts` - Baseline weather telemetry across all 25 Sri Lankan districts.
- `GET /api/v1/weather/districts/{district_id}` - Weather telemetry for a specific district.
- `GET /api/v1/radar/frames` - Timestamped Doppler radar tile frames and playback intervals.
- `GET /api/v1/emergency/nearby?lat={lat}&lon={lon}&radius_km={radius}` - Nearby hospitals and emergency shelters.
