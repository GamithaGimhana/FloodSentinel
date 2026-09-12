# 🌦️ Live Weather & Radar Service Branch (`feature/weather-service`)

This branch contains the real-time meteorological ingestion and radar cache service for **FloodSentinel**.

---

## 🎯 Branch Purpose
Primary Owner: **Member 1** (Data Engineering & Weather Service Lead)

Responsible for integrating live, open meteorological APIs to supply real-time rainfall and soil moisture measurements directly into the flood risk prediction engine.

---

## 📡 Integrated Meteorological APIs

### 1. Open-Meteo Weather API
- **Endpoint**: `https://api.open-meteo.com/v1/forecast`
- **Features Ingested**:
  - `precipitation` (mm/h current intensity)
  - `precipitation_sum` (7-day cumulative rainfall in mm)
  - `temperature_2m` (°C)
  - `soil_moisture_0_to_7cm` (m³/m³)
- **Coverage**: All 25 districts and custom GPS coordinates in Sri Lanka (`Asia/Colombo` timezone).
- **Authentication**: Free, zero API key required.

### 2. RainViewer Radar API
- **Endpoint**: `https://api.rainviewer.com/public/weather-maps.json`
- **Purpose**: Provides real-time and forecasted Doppler radar tile layers for Sri Lanka to render animated rain cloud overlays on the interactive map.

---

## 🔌 API Endpoints to Expose

- `GET /api/v1/weather/live?lat={lat}&lon={lon}` - Returns live temperature, hourly precipitation, and 7-day cumulative rainfall.
- `GET /api/v1/weather/districts` - Returns pre-fetched meteorological baselines for all 25 Sri Lankan districts.
- `GET /api/v1/radar/frames` - Returns timestamped radar tile URLs for the frontend Leaflet map layer.
