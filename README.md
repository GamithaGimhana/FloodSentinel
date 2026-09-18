# 🗺️ Frontend Interactive Radar Dashboard Branch (`feature/frontend-radar-map`)

This branch contains the user interface, geospatial visualization system, district intelligence insights, and interactive map components for **FloodSentinel**.

---

## 🎯 Branch Purpose
Responsible for building a modern, responsive React/TypeScript application that renders an interactive map of Sri Lanka, displays animated live weather radar layers, visualizes district flood alert levels, provides an end-to-end 23-feature model assessment interface, and renders real-time district assessment headlines with historical timeline charts.

---

## 💻 Tech Stack & Libraries
- **Framework**: React 18 + TypeScript + Vite (ultra-fast compilation and HMR)
- **Styling**: Vanilla CSS / Tailored CSS tokens with a dark/light responsive interface
- **Map & Geospatial**: `Leaflet` & `react-leaflet` with OpenStreetMap base layers
- **Radar Tile Engine**: RainViewer API tile overlays with timestamped frame progression
- **Geospatial Data**: Shared 25-district coordinates registry (`shared/districts.json`)
- **Unit Testing**: Node.js native test runner (`node --experimental-strip-types --test`)

---

## 🧩 UI Components & Views

```
frontend/src/
├── components/
│   ├── common/
│   │   ├── AssessmentInsights.tsx # District assessment headline, historical chart & comparison
│   │   └── Status.tsx             # Badge indicators for live system status
│   └── map/
│       ├── FloodMap.tsx           # Full Sri Lanka interactive Leaflet map with district markers
│       └── RadarOverlay.tsx       # Animated RainViewer Doppler radar tile player
├── services/
│   ├── assessment.ts              # District scenario baseline builder & percentage-point delta math
│   └── weatherService.ts          # Frontend API client communicating with backend endpoints
├── views/
│   ├── AlertEvacDashboardView.tsx # Integrated overview map, district telemetry & history timeline
│   ├── DistrictsView.tsx          # 25-district search, filter, and telemetry table
│   └── PredictionView.tsx         # Full 23-feature model input assessor & JSON importer
└── tests/
    └── assessment.test.mjs        # Regression tests for scenario baselines and probability point diffs
```

---

## 🚀 Running & Testing the Frontend

```powershell
# Run development server
npm run dev --prefix frontend

# Run unit tests
npm test --prefix frontend

# Production build check
npm run build --prefix frontend
```
