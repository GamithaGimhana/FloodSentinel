# ⚙️ Backend REST API & ML Inference Branch (`feature/backend-inference`)

This branch contains the core FastAPI model serving engine and validation pipeline for **FloodSentinel**.

---

## 🎯 Branch Purpose
Responsible for serving the trained `flood_alert_pipeline.pkl` model, validating incoming 23-feature telemetry dictionaries against strict Pydantic schemas, executing scenario stress tests, and applying isotonic calibration with the optimal $F_2$ decision threshold.

---

## 🏗️ Architecture & Modules

```
backend/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── predict_routes.py     # POST /api/v1/predict, /simulate, /predict/batch
│   │   │   └── weather.py            # Route registration
│   ├── core/
│   │   ├── config.py                 # App settings, CORS, model paths, rate limiting
│   │   └── thresholds.py             # 4-tier alert boundaries & decision threshold (0.2258)
│   ├── models/
│   │   └── schemas.py                # Strict 23-feature Pydantic validation schemas
│   ├── services/
│   │   ├── ml_service.py             # Pipeline loader, sample verification & threadsafe predictor
│   │   ├── scenario.py               # Hydrological baseline builder & scenario simulator
│   │   └── alert_categorizer.py      # Maps probability -> SAFE / ADVISORY / WARNING / CRITICAL
│   └── main.py                       # FastAPI lifespan startup & health/readiness endpoints
└── tests/
    ├── test_api_endpoints.py         # API contract, validation and error handling tests
    ├── test_integration.py           # End-to-end inference and scenario simulation tests
    └── conftest.py                   # Reusable mock fixtures and client test configuration
```

---

## 🚦 Calibrated Decision Threshold & Alert Policy

- **Learned Binary Decision Threshold**: `0.22580644488334656` (derived from cost-sensitive $F_2$ tuning optimizing flood recall $\ge 90\%$).
- **Display Tiers** (Project policy for intuitive risk visualization):
  - 🟢 **SAFE**: Probability $\le 0.25$
  - 🟡 **ADVISORY**: $0.25 < \text{Prob} \le 0.50$
  - 🟠 **WARNING**: $0.50 < \text{Prob} \le 0.75$
  - 🔴 **CRITICAL**: $\text{Prob} > 0.75$

---

## 🧪 Testing Backend Inference

From the repository root:

```powershell
python -m pytest backend/tests/ -q
```
