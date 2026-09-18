# 🌊 FloodSentinel — Sri Lanka Flood Risk & Early Warning System

A production-grade meteorological monitoring and flood risk classification system for Sri Lanka's 25 administrative districts. Combines live weather ingestion, calibrated machine learning inference, and seven-day scenario projections in a unified React + FastAPI application.

🔗 **Live Application:** [https://floodsentinel-207370591616.asia-south1.run.app](https://floodsentinel-207370591616.asia-south1.run.app)  
📖 **API Documentation (Swagger UI):** [https://floodsentinel-207370591616.asia-south1.run.app/docs](https://floodsentinel-207370591616.asia-south1.run.app/docs)  
🩺 **System Health Check:** [https://floodsentinel-207370591616.asia-south1.run.app/health](https://floodsentinel-207370591616.asia-south1.run.app/health)

> **Disclaimer:** The model is trained on synthetic balanced scenarios, not verified disaster observations. Scores are calibrated on the synthetic distribution and do not represent real-world flood probability. This is not an official early-warning system.

---

## 👥 Project Team & Academic Information

- **Module:** ITS-2140 – Machine Learning
- **Batch:** GDSE-071 (Panadura Branch)
- **Team Name:** Vanguard

### Group Members

| Student ID | Student Name | GitHub | Contribution Focus |
| :---: | :--- | :---: | :--- |
| `241711007` | **Gamitha Gimhana Jayasanka** | [@GamithaGimhana](https://github.com/GamithaGimhana) | Frontend Geospatial Map & Full ML Lifecycle |
| `241711098` | **Ushan Gimhan** | [@ushan-Gimhan](https://github.com/ushan-Gimhan) | Backend REST API, Inference Engine & DevOps |
| `241711093` | **Buddhika Aloka Fernando** | [@Alokafernando](https://github.com/Alokafernando) | Live Weather Ingestion, Radar & Emergency Overpass APIs |
| `241711043` | **Oshadha Sankalpa Thambavita** | [@OshadhaThambavita](https://github.com/OshadhaThambavita) | ML Dataset Synthesis & Calibration Analysis |

---

## 🚀 Quick Start

### Prerequisites

- Python 3.13+ with `pip`
- Node.js 22+ with `npm`

### Install & Run

```powershell
# Backend dependencies
pip install -r backend/requirements.txt

# Frontend dependencies
npm ci --prefix frontend

# Start both services
python scripts/dev.py
# Dashboard: http://127.0.0.1:5173  |  API docs: http://127.0.0.1:8000/docs
```

### ☁️ Cloud Deployment (Google Cloud Run)

FloodSentinel is live on **Google Cloud Run** (Mumbai `asia-south1` region):

- **Live Application:** [https://floodsentinel-207370591616.asia-south1.run.app](https://floodsentinel-207370591616.asia-south1.run.app)
- **API Documentation:** [https://floodsentinel-207370591616.asia-south1.run.app/docs](https://floodsentinel-207370591616.asia-south1.run.app/docs)

To redeploy or publish code updates:

```powershell
# Automated one-click deployment
.\scripts\deploy_gcp.ps1
```

### Retrain the Model

The model is shipped pre-trained. To reproduce from the balanced dataset:

```powershell
python scripts/train_model.py
```

This validates the dataset checksum, trains a HistGradientBoosting pipeline with isotonic calibration, selects an F2-optimal decision threshold, and atomically replaces `flood_alert_pipeline.pkl` and `model_metadata.json`.

---

## 📋 Machine Learning Pipeline (v2.0)

### Dataset

| Property | Value |
|---|---|
| **Source** | `assets/sri_lanka_flood_synthetic_balanced_120000.csv` |
| **Records** | 120,000 synthetic site scenarios |
| **Class balance** | 50% flood / 50% no-flood (60,000 each) |
| **Districts** | 25 (4,800 per district, 2,400 per class) |
| **Columns** | 46 total; 21 candidate predictors |
| **Splits** | Train 84,000 · Validation 18,000 · Test 18,000 |

### Feature Contract (21 predictors)

| Category | Features |
|---|---|
| **Geographic** | `district`, `elevation_m`, `distance_to_river_m`, `height_above_nearest_drainage_m` |
| **Land & soil** | `landcover`, `soil_type`, `drainage_index`, `soil_saturation_index` |
| **Rainfall** | `rainfall_24h_mm`, `rainfall_7d_mm`, `rainfall_30d_mm` |
| **Infrastructure** | `water_supply`, `electricity`, `road_quality`, `infrastructure_score`, `nearest_hospital_km`, `nearest_evac_km` |
| **Demographics** | `population_density_per_km2`, `built_up_percent`, `urban_rural` |
| **History** | `historical_flood_count` |

**Excluded (leakage/outcome-derived):** NDVI, NDWI, water_presence_flag, flood_risk_score, inundation_area_sqm, flood_depth_m, is_good_to_live, monthly_rainfall_mm, all IDs/provenance fields.

### Engineered Features (6, computed at inference)

| Feature | Formula |
|---|---|
| `hydrological_stress_index` | `rainfall_7d / (height_above_drainage + 1)` |
| `drainage_saturation_ratio` | `rainfall_7d × (1 − drainage_index)` |
| `rainfall_intensity_ratio` | `rainfall_24h / (rainfall_7d + 1)` |
| `river_proximity_buffer` | `exp(−distance_to_river / 1000)` |
| `log_population_density` | `log1p(population_density)` |
| `runoff_vulnerability` | `(built_up_percent / 100) / (drainage_index + 0.01)` |

### Model Architecture

- **Classifier:** `HistGradientBoostingClassifier` (max_iter=160, max_leaf_nodes=15, L2=10)
- **Calibration:** Isotonic Regression on 9,000 validation rows
- **Decision threshold:** `0.1216` (F2-optimal on 9,000 threshold-selection rows)
- **Feature pipeline:** Shared `FeatureBuilder` + `OrdinalEncoder` for categoricals

### Hold-Out Test Set Performance (18,000 records)

| Metric | Value |
|---|---|
| **ROC-AUC** | 0.7923 |
| **Average Precision** | 0.7804 (baseline: 0.50) |
| **Brier Score** | 0.1859 |
| **Recall (flood)** | 98.24% |
| **Precision** | 54.23% |
| **F1-Score** | 0.6988 |
| **False Negatives** | 158 / 9,000 |

> The F2-tuned threshold prioritizes recall (catching floods) at the cost of precision. 98.24% of synthetic floods are detected; real-world performance requires validation on observed events.

---

## 🛠️ Production Inference

The exported `flood_alert_pipeline.pkl` encapsulates feature engineering, encoding, classification, and calibration:

```python
import cloudpickle

pipeline = cloudpickle.load(open("flood_alert_pipeline.pkl", "rb"))

payload = {
    "district": "Kegalle",
    "elevation_m": 186.6,
    "distance_to_river_m": 526.5,
    "landcover": "Urban",
    "soil_type": "Clay",
    "water_supply": "Municipal",
    "electricity": "Grid",
    "road_quality": "Fair",
    "urban_rural": "Urban",
    "rainfall_7d_mm": 457.3,
    "rainfall_24h_mm": 44.1,
    "rainfall_30d_mm": 535.8,
    "height_above_nearest_drainage_m": 9.4,
    "soil_saturation_index": 0.591,
    "drainage_index": 0.214,
    "historical_flood_count": 0,
    "infrastructure_score": 61,
    "population_density_per_km2": 4761,
    "built_up_percent": 69.0,
    "nearest_hospital_km": 6.84,
    "nearest_evac_km": 1.74,
}

probability = float(pipeline.predict_proba(payload)[0, 1])
alert = int(pipeline.predict(payload)[0])
print(f"Calibrated score: {probability:.2%}")
print(f"Binary alert: {'FLOOD ALERT' if alert else 'BELOW THRESHOLD'}")
```

---

## 🌤️ Live Weather & Forecasts

The backend ingests real-time weather from Open-Meteo:
- **24-hour, 7-day, and 30-day** accumulated rainfall
- **Soil moisture** (surface, converted to saturation proxy)
- **7-day forecast** projections using forecast rainfall and soil moisture

District assessments combine live weather with scenario baselines for unmeasured inputs (river distance, land cover, infrastructure). Each assessment is recorded to SQLite history with full input provenance.

### API Endpoints

| Endpoint | Description |
|---|---|
| `POST /api/v1/predict` | Direct prediction with all 21 inputs |
| `POST /api/v1/simulate` | Scenario lab with defaults for unmeasured inputs |
| `POST /api/v1/forecast` | 7-day projection using forecast weather |
| `POST /api/v1/predict/batch` | Batch prediction (up to 25 locations) |
| `GET /api/v1/weather/districts` | All 25 districts with live weather + assessment |
| `GET /api/v1/weather/districts/{id}` | Single district telemetry |
| `GET /api/v1/weather/districts/{id}/history` | Assessment history (SQLite) |
| `GET /api/v1/weather/live` | Raw weather for any Sri Lanka coordinate |
| `GET /api/v1/radar/frames` | RainViewer radar tile metadata |
| `GET /api/v1/model` | Model metadata, input schema, sample payloads |

---

## 🧪 Testing

```powershell
# Backend (41 tests)
python -m pytest -q

# Frontend (4 tests + TypeScript check + build)
npm test --prefix frontend
npm run build --prefix frontend

# Docker Compose validation
docker compose config --quiet
```

---

## 🔬 Methodological Disclaimers

1. **Synthetic data:** All 120,000 records are generated from a hand-tuned logistic model, not observed flood events. The 50/50 class balance is a design choice, not an estimate of real flood prevalence.
2. **Same-day classification:** Rainfall windows include the scenario day. This is current-event classification, not advance forecasting. For true forecasting, predictors must be available before the target window.
3. **Leakage-free pipeline:** Encoders and scalers are fitted on training data only. Calibration and threshold selection use disjoint validation partitions. The test set was evaluated once.
4. **Forecast projections** use Open-Meteo forecast rainfall/soil moisture with fixed site conditions. The model has no future-event training labels; projection uncertainty is not quantified.
5. **Not an official warning system.** Scores do not establish safety. The four-tier display bands (SAFE/ADVISORY/WARNING/CRITICAL) are UI policies independent of the binary threshold.
