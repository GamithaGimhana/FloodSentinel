"""ML inference service: pipeline loading, feature transformation, and prediction engine."""

import logging
import math
import os
from pathlib import Path
from typing import Optional, Dict, Any, List

import numpy as np

from app.core.thresholds import CALIBRATED_THRESHOLD
from app.models.schemas import EngineeredFeatures

logger = logging.getLogger(__name__)

# Expected feature ordering matching the trained scikit-learn pipeline
# This list is derived from the notebook Step 5 (Feature Engineering) + Step 6 (Splitting)
# Original raw features (after Step 4 cleaning) + 6 engineered features
MODEL_FEATURE_ORDER: List[str] = [
    # --- Raw geographic & meteorological features ---
    "latitude",
    "longitude",
    "elevation_m",
    "distance_to_river_m",
    "rainfall_7d_mm",
    "monthly_rainfall_mm",
    "drainage_index",
    "ndvi",
    "ndwi",
    "population_density_per_km2",
    "built_up_percent",
    "infrastructure_score",
    # --- 6 Engineered domain features (Step 5) ---
    "hydrological_stress_index",
    "drainage_saturation_ratio",
    "water_veg_contrast",
    "river_proximity_buffer",
    "log_population_density",
    "runoff_vulnerability",
]

# Default model artifact path
MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "model"
MODEL_PKL_PATH = MODEL_DIR / "flood_alert_pipeline.pkl"
MODEL_METADATA_PATH = MODEL_DIR / "model_metadata.json"


class MLService:
    """
    Production ML inference service for FloodSentinel.

    Supports two modes:
    1. **Pipeline mode**: Loads a trained scikit-learn pipeline from .pkl file.
    2. **Heuristic mode**: Falls back to a domain-knowledge-based heuristic
       calculator when no trained model is available (development/demo).
    """

    def __init__(self):
        self._pipeline = None
        self._model_type = "heuristic"
        self._threshold = CALIBRATED_THRESHOLD
        self._feature_order = MODEL_FEATURE_ORDER

    def load_pipeline(self) -> bool:
        """
        Attempts to load the serialized scikit-learn pipeline from disk.
        Returns True if successfully loaded, False if falling back to heuristic.
        """
        if MODEL_PKL_PATH.exists():
            try:
                import joblib
                self._pipeline = joblib.load(str(MODEL_PKL_PATH))
                self._model_type = "pipeline"
                logger.info(f"ML pipeline loaded successfully from {MODEL_PKL_PATH}")

                # Load metadata if available
                if MODEL_METADATA_PATH.exists():
                    import json
                    with open(MODEL_METADATA_PATH, "r") as f:
                        metadata = json.load(f)
                    if "threshold" in metadata:
                        self._threshold = float(metadata["threshold"])
                    if "feature_order" in metadata:
                        self._feature_order = metadata["feature_order"]
                    logger.info(f"Model metadata loaded: threshold={self._threshold}")

                return True
            except Exception as exc:
                logger.warning(f"Failed to load ML pipeline: {exc}. Falling back to heuristic mode.")
                self._pipeline = None
                self._model_type = "heuristic"
                return False
        else:
            logger.info(
                f"No pipeline found at {MODEL_PKL_PATH}. "
                "Running in heuristic mode (suitable for development and demo)."
            )
            self._model_type = "heuristic"
            return False

    def transform_features(self, raw_input: Dict[str, Any]) -> EngineeredFeatures:
        """
        Computes the 6 domain-specific engineered features from raw inputs.

        These replicate exactly the notebook Step 5 feature engineering formulas:
        1. hydrological_stress_index = rainfall_7d_mm / (elevation_m + 1.0)
        2. drainage_saturation_ratio = monthly_rainfall_mm / (drainage_index + 0.01)
        3. water_veg_contrast = ndwi - ndvi
        4. river_proximity_buffer = 1000 / (distance_to_river_m + 1.0)
        5. log_population_density = log(population_density_per_km2 + 1)
        6. runoff_vulnerability = (rainfall_7d_mm * ndwi) / (elevation_m + 1.0)
        """
        elevation = float(raw_input.get("elevation_m", 50))
        rainfall_7d = float(raw_input.get("rainfall_7d_mm", 50))
        monthly_rain = float(raw_input.get("monthly_rainfall_mm", 200))
        drainage = float(raw_input.get("drainage_index", 0.5))
        ndvi = float(raw_input.get("ndvi", 0.35))
        ndwi = float(raw_input.get("ndwi", 0.25))
        distance_river = float(raw_input.get("distance_to_river_m", 2000))
        pop_density = float(raw_input.get("population_density_per_km2", 500))

        return EngineeredFeatures(
            hydrological_stress_index=round(rainfall_7d / (elevation + 1.0), 4),
            drainage_saturation_ratio=round(monthly_rain / (drainage + 0.01), 4),
            water_veg_contrast=round(ndwi - ndvi, 4),
            river_proximity_buffer=round(1000.0 / (distance_river + 1.0), 4),
            log_population_density=round(math.log(pop_density + 1), 4),
            runoff_vulnerability=round((rainfall_7d * ndwi) / (elevation + 1.0), 4),
        )

    def predict(self, raw_input: Dict[str, Any]) -> float:
        """
        Runs flood probability prediction on raw input features.

        Returns:
            float: Flood probability between 0.0 and 1.0
        """
        engineered = self.transform_features(raw_input)

        if self._pipeline is not None and self._model_type == "pipeline":
            return self._predict_with_pipeline(raw_input, engineered)
        else:
            return self._predict_heuristic(raw_input, engineered)

    def _predict_with_pipeline(
        self, raw_input: Dict[str, Any], engineered: EngineeredFeatures
    ) -> float:
        """Runs prediction through the loaded scikit-learn pipeline."""
        # Build feature vector in exact column order expected by pipeline
        feature_dict = {
            "latitude": raw_input.get("latitude", 7.0),
            "longitude": raw_input.get("longitude", 80.0),
            "elevation_m": raw_input.get("elevation_m", 50),
            "distance_to_river_m": raw_input.get("distance_to_river_m", 2000),
            "rainfall_7d_mm": raw_input.get("rainfall_7d_mm", 50),
            "monthly_rainfall_mm": raw_input.get("monthly_rainfall_mm", 200),
            "drainage_index": raw_input.get("drainage_index", 0.5),
            "ndvi": raw_input.get("ndvi", 0.35),
            "ndwi": raw_input.get("ndwi", 0.25),
            "population_density_per_km2": raw_input.get("population_density_per_km2", 500),
            "built_up_percent": raw_input.get("built_up_percent", 25),
            "infrastructure_score": raw_input.get("infrastructure_score", 50),
            "hydrological_stress_index": engineered.hydrological_stress_index,
            "drainage_saturation_ratio": engineered.drainage_saturation_ratio,
            "water_veg_contrast": engineered.water_veg_contrast,
            "river_proximity_buffer": engineered.river_proximity_buffer,
            "log_population_density": engineered.log_population_density,
            "runoff_vulnerability": engineered.runoff_vulnerability,
        }

        # Align to model feature order
        feature_vector = np.array(
            [[feature_dict.get(f, 0.0) for f in self._feature_order]]
        )

        try:
            proba = self._pipeline.predict_proba(feature_vector)[0][1]
            return float(max(0.0, min(1.0, proba)))
        except Exception as exc:
            logger.error(f"Pipeline prediction failed: {exc}. Falling back to heuristic.")
            return self._predict_heuristic(raw_input, engineered)

    def _predict_heuristic(
        self, raw_input: Dict[str, Any], engineered: EngineeredFeatures
    ) -> float:
        """
        Domain-knowledge-based heuristic flood probability estimator.

        Uses weighted combination of engineered features to approximate
        the trained model's behavior. Suitable for development and demo
        before the full ML pipeline (Steps 7-11) is trained.
        """
        # Normalize each engineered feature to 0-1 range using domain-aware bounds
        stress_norm = min(1.0, engineered.hydrological_stress_index / 30.0)
        drainage_norm = min(1.0, engineered.drainage_saturation_ratio / 5000.0)
        contrast_norm = min(1.0, max(0.0, (engineered.water_veg_contrast + 0.5) / 1.0))
        proximity_norm = min(1.0, engineered.river_proximity_buffer / 2.0)
        pop_norm = min(1.0, engineered.log_population_density / 10.0)
        runoff_norm = min(1.0, max(0.0, engineered.runoff_vulnerability / 15.0))

        # Elevation penalty (low elevation = higher risk)
        elevation = float(raw_input.get("elevation_m", 50))
        elevation_factor = max(0.0, 1.0 - (elevation / 500.0))

        # Weighted combination mimicking trained model feature importances
        raw_score = (
            stress_norm * 0.25 +
            drainage_norm * 0.15 +
            contrast_norm * 0.12 +
            proximity_norm * 0.15 +
            runoff_norm * 0.13 +
            elevation_factor * 0.10 +
            pop_norm * 0.05 +
            min(1.0, float(raw_input.get("rainfall_7d_mm", 50)) / 250.0) * 0.05
        )

        # Apply sigmoid-like calibration to produce realistic probability distribution
        calibrated = 1.0 / (1.0 + math.exp(-8.0 * (raw_score - 0.45)))
        return round(max(0.02, min(0.98, calibrated)), 4)

    @property
    def model_type(self) -> str:
        return self._model_type

    @property
    def threshold(self) -> float:
        return self._threshold


ml_service = MLService()
