# 🗺️ Frontend Interactive Radar Dashboard Branch (`feature/frontend-radar-map`)

This branch contains the user interface, geospatial visualization system, and interactive map components for **FloodSentinel**.

---

## 🎯 Branch Purpose
Primary Owner: **Member 3** (Frontend & Geospatial Lead)

Responsible for building a modern, responsive React/TypeScript application that renders an interactive map of Sri Lanka, displays animated live weather radar layers, visualizes district flood alert levels, and provides an end-to-end 23-feature model assessment interface.

---

## 💻 Tech Stack & Libraries
- **Framework**: React 18 + TypeScript + Vite (ultra-fast compilation and HMR)
- **Styling**: Vanilla CSS / Tailored CSS tokens with a dark/light responsive interface
- **Map & Geospatial**: `Leaflet` & `react-leaflet` with OpenStreetMap base layers
- **Radar Tile Engine**: RainViewer API tile overlays with timestamped frame progression
- **Geospatial Data**: Shared 25-district coordinates registry (`shared/districts.json`)

---

## 🧩 UI Components & Views

```
frontend/src/
├── components/
│   ├── map/
│   │   ├── FloodMap.tsx          # Full Sri Lanka interactive Leaflet map with district markers
│   │   └── RadarOverlay.tsx      # Animated RainViewer Doppler radar tile player
│   └── common/
│       └── Status.tsx            # Badge indicators for live system status
├── views/
│   ├── DistrictsView.tsx         # 25-district search, filter, and telemetry table
│   └── PredictionView.tsx        # Full 23-feature model input assessor & JSON importer
└── services/
    └── weatherService.ts         # Frontend API client communicating with backend endpoints
```

---

## 🚀 Running the Frontend Locally

From the `frontend/` directory or root:

```powershell
npm run dev --prefix frontend
```

Accessible at [http://localhost:5173](http://localhost:5173).
