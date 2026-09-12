# 🔬 Machine Learning Pipeline Branch (`model/ml-pipeline`)

This branch contains the full Machine Learning lifecycle for **FloodSentinel - Sri Lanka Flood Risk & Early Warning System**.

---

## 🎯 Branch Purpose
All 4 group members collaborate directly in this branch to develop, evaluate, and optimize the machine learning models. Every student authors specific steps to ensure an active, balanced GitHub commit history for the viva voce.

---

## 📋 The 11-Step ML Lifecycle & Member Allocation

| Step | ML Stage | Assigned Member | Focus & Deliverables |
| :---: | :--- | :---: | :--- |
| **01** | **Problem Definition** | **Member 1** | Sri Lanka hydrological context (Kelani/Kalu basins), DMC alert requirements, cost-sensitive classification formulation. |
| **02** | **Data Collection** | **Member 1** | Ingestion of `sri_lanka_flood_risk_dataset_25000.csv` (25,000 records, 32 attributes), shape & type audits. |
| **03** | **Data Understanding (EDA)** | **Member 2** | Target distribution (~9.9% positive class), district-level flood incidence, correlation heatmaps, NDWI/NDVI plots. |
| **04** | **Data Cleaning** | **Member 1** | Impute `electricity` missing values, handle conditional nulls, drop non-predictive IDs (`record_id`, `is_synthetic`), outlier treatment. |
| **05** | **Feature Engineering** | **Member 2** | Implement 6 mandatory domain techniques: Hydrological Stress Index, Drainage Saturation, NDWI-NDVI difference, River proximity decay, Log transforms, District target encoding. |
| **06** | **Dataset Splitting** | **Member 1** | Stratified Train/Val/Test (70% / 15% / 15%) preserving the 9.9% flood class ratio without data leakage. |
| **07** | **Algorithm Selection** | **Member 3** | Benchmark 5 diverse architectures: Logistic Regression, Random Forest, XGBoost, LightGBM, CatBoost. |
| **08** | **Model Training** | **Member 3** | 5-Fold Stratified Cross-Validation, learning curves, and loss tracking across all 5 models. |
| **09** | **Model Evaluation** | **Member 4** | PR-AUC, ROC-AUC, Confusion Matrix, and disaster cost matrix (penalizing False Negatives 10x over False Positives). |
| **10** | **Model Improvement** | **Member 4** | Optuna Bayesian hyperparameter optimization, probability calibration, and threshold shifting (>90% flood recall). |
| **11** | **Deployment & Export** | **Member 4** | End-to-end `scikit-learn` Pipeline assembly, export to `flood_alert_pipeline.pkl`, and generation of `model_metadata.json`. |

---

## 🛠️ Key Technical Guidelines
1. **Never fit transformers on the validation or test set** (Strict leakage prevention).
2. **Handle class imbalance (~9.9% positive class)** using `scale_pos_weight`, SMOTE, or Focal Loss.
3. **Prioritize Recall and Precision-Recall AUC (PR-AUC)** over raw Accuracy, as false negatives in disaster prediction carry severe consequences.
4. **Final Export**: Ensure `flood_alert_pipeline.pkl` encapsulates the complete transformation and inference logic so the backend API can run inference directly on raw JSON inputs.
