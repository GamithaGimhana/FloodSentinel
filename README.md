# 🌊 FloodSentinel - Sri Lanka Flood Early Warning & Real-Time Radar System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10%2B-brightgreen.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%20%2F%20Vite-61DAFB.svg)](https://vitejs.dev/)
[![Leaflet](https://img.shields.io/badge/Map-Leaflet.js-199900.svg)](https://leafletjs.com/)

**FloodSentinel** is a full-stack, machine-learning-driven disaster early warning system and live meteorological radar tailored for Sri Lanka. Designed for citizens and disaster response authorities (such as the Disaster Management Centre - DMC), it predicts flood occurrence and severity across all 25 Sri Lankan districts using terrain, satellite spectral indices, hydrological stress parameters, and real-time precipitation.

---

## 📌 Key Highlights

- **Real-Time Weather Integration**: Dynamic ingestion of precipitation, 7-day cumulative rainfall, and soil moisture via the **Open-Meteo Weather API**.
- **Live Doppler Weather Radar**: Interactive animated rain-radar tile layer powered by **RainViewer** overlaid on an interactive Sri Lanka Leaflet map.
- **Machine Learning Inference Engine**: Cost-sensitive, threshold-optimized ensemble models predicting flood risk and calibrated severity scores.
- **Four-Tier Alert Level System**:
  - 🟢 **SAFE (0.00 – 0.25 probability)**: Normal seasonal conditions.
  - 🟡 **ADVISORY (0.26 – 0.50 probability)**: Moderate risk; monitor river levels and rainfall.
  - 🟠 **WARNING (0.51 – 0.75 probability)**: High risk; secure documents and prepare evacuation kits.
  - 🔴 **CRITICAL EMERGENCY (0.76 – 1.00 probability)**: Imminent flooding; immediate evacuation required (DMC Hotline: 117).
- **Emergency Evacuation Guide**: Automatic distance calculation and routing to the nearest hospital and emergency evacuation shelter.

---

## 🏗️ System Architecture

```
[ Sri Lankan Citizens / DMC Officials ]
                   │
                   ▼
┌────────────────────────────────────────────────────────┐
│               Frontend Web Application                 │
│         (React / Vite + TailwindCSS + Leaflet)         │
│  - Live RainViewer Radar Map    - Risk Gauge Meter     │
│  - 25 District Selector        - Emergency Cards       │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP POST /api/v1/predict
                           │ HTTP GET  /api/v1/weather/live
                           ▼
┌────────────────────────────────────────────────────────┐
│                 Backend REST API                       │
│                     (FastAPI)                          │
│  - Open-Meteo Weather Service   - Pydantic Validation  │
│  - Feature Engineering Engine   - Evacuation Router    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│            Trained ML Pipeline (.pkl)                  │
│  - Imbalance Handled (SMOTE / scale_pos_weight)        │
│  - Calibrated Decision Threshold (>90% Recall)         │
└────────────────────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```
FloodSentinel/
├── backend/                  # FastAPI REST API & ML Inference Service
│   ├── app/
│   │   ├── api/              # API Route Controllers
│   │   ├── core/             # Configuration & Settings
│   │   ├── models/           # Pydantic Schemas
│   │   └── services/         # Weather API & ML Predictor
│   └── model/                # Serialized Model Artifacts (.pkl & metadata)
├── frontend/                 # Interactive Radar Dashboard (React + Vite + Leaflet)
│   ├── src/
│   │   ├── components/       # Map, Gauge, Evacuation & Alert Components
│   │   └── assets/
│   └── package.json
├── notebooks/                # Machine Learning Pipeline (11 Stages)
│   └── flood_prediction_sri_lanka.ipynb
├── data/                     # Dataset Storage
├── docs/                     # Project Documentation & Viva Voce Guides
├── docker-compose.yml        # Multi-container local deployment
└── README.md
```

---

## 👥 Team & Contribution Matrix (Group of 4)

| Member | ML Pipeline Contribution (`model/ml-pipeline`) | Full-Stack & System Contribution |
| :--- | :--- | :--- |
| **Member 1** | Steps 1, 2, 4, 6: Problem Definition, Data Ingestion, Data Cleaning & Stratified Splitting | Backend Open-Meteo Live Weather Service & District Defaults |
| **Member 2** | Steps 3, 5: Geospatial EDA & 6 Mandatory Domain Feature Engineering Techniques | FastAPI Model Loader, Transformer Engine & Alert Categorizer |
| **Member 3** | Steps 7, 8: 5-Model Selection Benchmarking & 5-Fold Stratified Cross-Validation | Frontend Leaflet Map with RainViewer Animated Radar Layer |
| **Member 4** | Steps 9, 10, 11: Cost-Sensitive Evaluation, Optuna Tuning & Model Serialization (`.pkl`) | Emergency Evacuation Locator, Risk Gauge, Docker & DevOps |

---

## 🚀 Quick Start (Development)

### 1. Clone the Repository
```bash
git clone https://github.com/GamithaGimhana/FloodSentinel.git
cd FloodSentinel
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
API Documentation will be available at: `http://localhost:8000/docs`

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
Dashboard will be available at: `http://localhost:5173`

---

## 📄 License
This project is licensed under the MIT License.
