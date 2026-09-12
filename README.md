# 🗺️ Frontend Interactive Radar Dashboard Branch (`feature/frontend-radar-map`)

This branch contains the user interface and geospatial visualization system for **FloodSentinel**.

---

## 🎯 Branch Purpose
Primary Owner: **Member 3** (Frontend & Geospatial Lead)

Responsible for building a modern, responsive web application that renders an interactive map of Sri Lanka, displays animated live weather radar layers, visualizes district flood alert levels, and lets citizens test custom rainfall scenarios.

---

## 💻 Tech Stack & Libraries
- **Framework**: React 18 + Vite (ultra-fast build and HMR)
- **Styling**: Vanilla CSS / TailwindCSS (Clean, modern dark-mode aesthetic)
- **Map & Geospatial**: `Leaflet` & `react-leaflet`
- **Radar Tile Engine**: RainViewer API tile overlays with timestamp slider and playback controls
- **Icons**: Lucide React

---

## 🧩 UI Components

```
frontend/src/components/
├── FloodMap.jsx          # Full Sri Lanka interactive map with GeoJSON polygons & district pins
├── RadarOverlay.jsx      # Animated Doppler weather radar tile player
├── DistrictSelector.jsx  # Quick navigation to all 25 Sri Lankan districts
├── WeatherSummary.jsx    # Real-time rainfall, temperature & humidity card
├── ScenarioSliders.jsx   # Interactive sliders to test heavy monsoon rainfall scenarios
└── AlertBanner.jsx       # Color-coded emergency alert status header
```

---

## 🎨 UI Features
1. **Interactive District Pins**: Color-coded markers (Green, Yellow, Orange, Red) reflecting real-time flood risk.
2. **Live Radar Animation**: Play/Pause controls to watch precipitation movement across Sri Lanka.
3. **Citizen Location Finder**: "Use My Location" GPS button to instantly calculate local flood risk.
