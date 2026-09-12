# ⚙️ Backend REST API & ML Inference Branch (`feature/backend-inference`)

This branch contains the core FastAPI application and model serving engine for **FloodSentinel**.

---

## 🎯 Branch Purpose
Primary Owner: **Member 2** (ML Optimization & Backend Inference Lead)

Responsible for serving the trained `flood_alert_pipeline.pkl` model, executing on-the-fly feature transformations, applying calibrated decision thresholds, and categorizing flood risk.

---

## 🏗️ Architecture & Modules

```
backend/
├── app/
│   ├── api/
│   │   ├── predict_routes.py     # POST /api/v1/predict, POST /api/v1/simulate
│   │   └── district_routes.py    # GET /api/v1/districts
│   ├── core/
│   │   ├── config.py             # App settings, CORS, model paths
│   │   └── thresholds.py         # 4-tier alert boundaries & weights
│   ├── models/
│   │   └── schemas.py            # Pydantic input/output validation models
│   └── services/
│       ├── ml_service.py         # Pipeline loader, feature aligner & predictor
│       └── alert_categorizer.py  # Maps raw probability -> Safe/Advisory/Warning/Critical
└── model/
    ├── flood_alert_pipeline.pkl  # Serialized scikit-learn pipeline
    └── model_metadata.json       # Feature ordering, thresholds & metrics
```

---

## 🚦 Alert Level Decision Logic

| Alert Level | Calibrated Probability | Risk Score | Recommended Action |
| :--- | :---: | :---: | :--- |
| 🟢 **SAFE** | 0.00 – 0.25 | 0 – 30 | Normal conditions. |
| 🟡 **ADVISORY** | 0.26 – 0.50 | 31 – 55 | Monitor DMC river gauges; stay alert. |
| 🟠 **WARNING** | 0.51 – 0.75 | 56 – 75 | High danger; secure supplies & prepare evacuation kit. |
| 🔴 **CRITICAL** | 0.76 – 1.00 | 76 – 100 | Imminent flood threat; immediate evacuation (Hotline 117). |
