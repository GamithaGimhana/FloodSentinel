# 🌊 FloodSentinel - Sri Lanka Flood Risk & Early Warning System
## Machine Learning Pipeline (`model/ml-pipeline`)

This branch hosts the complete Machine Learning lifecycle for **FloodSentinel**, an automated disaster early warning and flood risk classification system tailored to Sri Lanka's hydro-meteorological landscape.

---

## 🚀 Quick Start: Running the Notebook

1. **Prerequisites & Environment:**
   - Python 3.9+ with Jupyter Notebook or VS Code Jupyter extension.
   - Ensure the dataset is located at: `assets/sri_lanka_flood_risk_dataset_25000.csv`.
2. **Execution:**
   - Open [`notebooks/flood_prediction_sri_lanka.ipynb`](notebooks/flood_prediction_sri_lanka.ipynb).
   - Select your Python kernel and click **Run All**.
   - The first code cell automatically verifies and installs missing libraries (`optuna`, `xgboost`, `lightgbm`, `catboost`, `cloudpickle`, etc.) directly into the chosen kernel.
   - Working directory: Both the project root and `notebooks/` are supported.
3. **Generated Artifacts:**
   - On full execution, the notebook generates the production-ready inference artifacts in the project root:
     - `flood_alert_pipeline.pkl`: Self-contained `scikit-learn` Pipeline.
     - `model_metadata.json`: Architecture specs, metrics, threshold, and sample payloads.

---

## 📋 The 11-Step Machine Learning Lifecycle

The end-to-end machine learning pipeline covers all stages from problem formulation to production deployment:

| Step | ML Stage | Core Deliverables & Methodological Focus |
| :---: | :--- | :--- |
| **01** | **Problem Definition** | Sri Lanka hydrological context (Kelani, Kalu, Gin, Nilwala basins), disaster cost matrix ($C_{FN} = 10 \times C_{FP}$), and asymmetric binary classification formulation. |
| **02** | **Data Collection & Ingestion** | Ingestion of 25,000 spatial records (32 attributes) across 25 administrative districts; attribute schema and integrity audit. |
| **03** | **Data Understanding (EDA)** | Geospatial flood distribution, class imbalance (~9.89% positive class), correlation matrix, NDWI moisture vs. NDVI vegetation interaction plots. |
| **04** | **Data Cleaning & Quality** | Audit missing values and physical ranges; drop 8 non-predictive IDs and target leakage columns; defer learned imputation to training partitions to eliminate leakage. |
| **05** | **Feature Engineering** | Engineer 6 physical hydrological indicators (Hydrological Stress Index, Drainage Saturation Ratio, NDWI-NDVI Contrast, River Proximity Decay, Log Population Density, Runoff Vulnerability). |
| **06** | **Dataset Splitting** | Stratified Train/Val/Test (70% / 15% / 15%) strictly preserving the 9.89% flood class ratio; zero index overlap verified before scaling or encoding. |
| **07** | **Algorithm Selection** | Benchmark 5 diverse model architectures (Logistic Regression, Random Forest, XGBoost, LightGBM, CatBoost) using inner training holdouts and one-hot encoding. |
| **08** | **Model Training & Cross-Validation** | 5-fold Stratified Cross-Validation refitting full pipelines within each fold; XGBoost log-loss tracking and learning curves. |
| **09** | **Baseline Model Evaluation** | Out-of-fold diagnostic evaluation: PR-AUC, ROC-AUC, Brier score, and disaster cost matrix analysis ($FP \times 1 + FN \times 10$). |
| **10** | **Model Improvement & Calibration** | Optuna Bayesian TPE hyperparameter optimization, Isotonic probability calibration on Val-A, and cost-sensitive threshold shifting ($F_2$-optimization enforcing $\ge 90\%$ Flood Recall on Val-B). |
| **11** | **Deployment & Export** | End-to-end `scikit-learn` Pipeline assembly (`RawDataSanitizer` + `HydrologicalFeatureEngineer` + `RobustScaler`/`OneHotEncoder` + `CalibratedThresholdClassifier`), test holdout verification, and export. |

---

## 📊 Final Model Architecture & Performance

### Selected Model Architecture
- **Classifier:** Optuna-Tuned Extreme Gradient Boosting (`XGBoost`) with `scale_pos_weight ≈ 9.12`
- **Calibration:** Isotonic Regression (`IsotonicRegression(out_of_bounds='clip')`)
- **Decision Threshold:** Cost-optimal threshold shifted from `0.50` $\to$ `0.2258` to prioritize life-safety (missed floods penalized 10x)

### Hold-Out Test Set Benchmark (3,750 Records)

| Model Configuration | Decision Threshold | PR-AUC | ROC-AUC | Recall (Flood) | Precision | F1-Score | False Negatives ($FN$) | Disaster Cost ($FP\cdot 1 + FN\cdot 10$) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Baseline XGBoost (Step 9)** | 0.5000 | 0.6057 | 0.9602 | 93.53% | 52.10% | 0.6692 | 24 | 559.0 |
| **Optuna-Tuned XGBoost** | 0.5000 | 0.6174 | 0.9631 | 88.14% | 58.60% | 0.7040 | 44 | 671.0 |
| **Optuna-Tuned (Shifted)** | 0.2258 | 0.6174 | 0.9631 | 99.73% | 42.09% | 0.5920 | 1 | 519.0 |
| **Tuned + Calibrated (FINAL)** | **0.2258** | **0.6085** | **0.9627** | **96.50%** | **54.08%** | **0.6931** | **13** | **434.0** |

> **Key Takeaway:** The final pipeline achieves **96.50% Flood Recall** (comfortably exceeding the $\ge 90\%$ disaster safety threshold) while reducing disaster cost from **559.0 to 434.0 (22.4% reduction)**.

---

## 🛠️ Production Pipeline & Standalone Inference

The exported `flood_alert_pipeline.pkl` encapsulates the complete transformation graph so backend services can pass raw, un-engineered JSON dictionaries:

```python
import joblib

# 1. Load the exported production pipeline
pipeline = joblib.load("flood_alert_pipeline.pkl")

# 2. Raw incoming telemetry payload (no pre-engineered features required)
telemetry_input = {
    "district": "Kalutara",
    "elevation_m": 18.5,
    "distance_to_river_m": 450.0,
    "landcover": "Agricultural",
    "soil_type": "Alluvial",
    "water_supply": "Well water",
    "electricity": "Grid",
    "road_quality": "Paved",
    "urban_rural": "Rural",
    "rainfall_7d_mm": 285.0,
    "monthly_rainfall_mm": 390.0,
    "drainage_index": 0.28,
    "ndwi": 0.35,
    "ndvi": 0.12,
    "water_presence_flag": "Likely",
    "historical_flood_count": 4,
    "infrastructure_score": 32,
    "population_density_per_km2": 420.0,
    "built_up_percent": 35.0,
    "nearest_hospital_km": 8.2,
    "nearest_evac_km": 4.1
}

# 3. Predict calibrated probability & binary alert
calibrated_prob = float(pipeline.predict_proba(telemetry_input)[0, 1])
is_flood_alert = int(pipeline.predict(telemetry_input)[0])

print(f"Calibrated Flood Risk: {calibrated_prob:.2%}")
print(f"Actionable Output:     {'RED ALERT (EVACUATE)' if is_flood_alert else 'NORMAL CONDITIONS'}")
```

---

## 🔬 Rigorous Academic Scope & Methodological Disclaimers

In accordance with rigorous machine learning standards:
1. **Synthetic Data Context:** All 25,000 dataset records are labeled with `is_synthetic = True`. The model demonstrates current-event flood classification/nowcasting under synthetic distributions, not verified advance early-warning forecast performance.
2. **Leakage-Free Validation Guarantee:**
   - Missing value imputation and scaling are never fitted across the whole dataset.
   - Transformers are fitted strictly within training partitions (including inside each cross-validation fold).
   - The Validation partition was split into two independent halves: Val-A for isotonic calibration fitting, and Val-B for $F_2$ threshold selection.
   - The hold-out Test set was touched strictly once for final audit.
3. **Evaluation Boundaries:** A random stratified split evaluates independent observations from the same distribution; spatial cross-validation (by river basin or district) and out-of-time temporal evaluations are required before real-world operational deployment.
4. **Output Format:** The pipeline produces a continuous calibrated probability and a binary operational flag; granular four-tier alert policies are not part of this model output.
