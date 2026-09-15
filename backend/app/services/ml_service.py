"""One feature contract and inference entry point for every application view."""
import json
import logging
import math
from pathlib import Path
import numpy as np
from app.core.thresholds import CALIBRATED_THRESHOLD
from app.models.schemas import EngineeredFeatures, PredictionResponse
from app.services.alert_categorizer import AlertCategorizer

logger = logging.getLogger(__name__)
FEATURE_VERSION = "notebook-step5-v1"
MODEL_FEATURE_ORDER: list[str] = [
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


MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "model"
MODEL_PKL_PATH = MODEL_DIR / "flood_alert_pipeline.pkl"
MODEL_METADATA_PATH = MODEL_DIR / "model_metadata.json"

class MLService:
    def __init__(self):
        self._pipeline = None
        self._model_type = "heuristic"
        self._threshold = CALIBRATED_THRESHOLD
        self._feature_order = list(MODEL_FEATURE_ORDER)
        self.load_error = None

    def load_pipeline(self):
        self.__init__()
        if not MODEL_PKL_PATH.exists():
            return False
        try:
            import joblib
            metadata = json.loads(MODEL_METADATA_PATH.read_text(encoding="utf-8"))
            if metadata.get("feature_version") != FEATURE_VERSION:
                raise ValueError("Model feature_version does not match the shared feature contract")
            order = metadata["feature_order"]
            if len(order) != len(MODEL_FEATURE_ORDER) or set(order) != set(MODEL_FEATURE_ORDER):
                raise ValueError("Model must declare exactly the 18 supported features")
            threshold = float(metadata["threshold"])
            if not 0 < threshold < 1:
                raise ValueError("Invalid model threshold")
            # Only load a trusted, locally supplied artifact. Pickle is executable code.
            pipeline = joblib.load(MODEL_PKL_PATH)
            if not hasattr(pipeline, "predict_proba") or list(pipeline.classes_).count(1) != 1:
                raise ValueError("Expected a probabilistic classifier with positive class 1")
            self._pipeline, self._feature_order = pipeline, order
            self._threshold, self._model_type = threshold, "pipeline"
            return True
        except Exception as exc:
            self.load_error = str(exc)
            logger.exception("Model load failed; demonstration mode remains active")
            return False

    def transform_features(self, raw):
        elevation = float(raw.get("elevation_m", 50))
        rain = float(raw.get("rainfall_7d_mm", 50))
        drainage = float(raw.get("drainage_index", .5))
        return EngineeredFeatures(
            hydrological_stress_index=round(rain / (elevation + 1), 4),
            drainage_saturation_ratio=round(rain * (1 - drainage), 4),
            water_veg_contrast=round(float(raw.get("ndwi", .25)) - float(raw.get("ndvi", .35)), 4),
            river_proximity_buffer=round(math.exp(-float(raw.get("distance_to_river_m", 2000)) / 1000), 4),
            log_population_density=round(math.log1p(float(raw.get("population_density_per_km2", 500))), 4),
            runoff_vulnerability=round((float(raw.get("built_up_percent", 25)) / 100) / (drainage + .01), 4),
        )

    def _predict_heuristic(self, raw, features):
        # A demonstration score only, not a fitted or calibrated probability.
        score = (
            min(1, features.hydrological_stress_index / 30) * .25
            + min(1, features.drainage_saturation_ratio / 250) * .15
            + min(1, max(0, features.water_veg_contrast + .5)) * .12
            + features.river_proximity_buffer * .15
            + min(1, features.runoff_vulnerability / 5) * .13
            + max(0, 1 - float(raw.get("elevation_m", 50)) / 500) * .10
            + min(1, features.log_population_density / 10) * .05
            + min(1, float(raw.get("rainfall_7d_mm", 50)) / 250) * .05
        )
        return round(1 / (1 + math.exp(-8 * (score - .45))), 4)

    def evaluate(self, raw):
        features = self.transform_features(raw)
        mode, threshold = "heuristic", CALIBRATED_THRESHOLD
        probability = None
        if self._pipeline is not None:
            try:
                values = {**raw, **features.model_dump()}
                vector = [[values[name] for name in self._feature_order]]
                if hasattr(self._pipeline, "feature_names_in_"):
                    import pandas as pd
                    vector = pd.DataFrame(vector, columns=self._feature_order)
                else:
                    vector = np.asarray(vector, dtype=float)
                class_index = list(self._pipeline.classes_).index(1)
                probability = float(self._pipeline.predict_proba(vector)[0][class_index])
                if not math.isfinite(probability) or not 0 <= probability <= 1:
                    raise ValueError("Invalid model probability")
                mode, threshold = "pipeline", self._threshold
            except Exception:
                logger.exception("Inference failed; this result is explicitly marked heuristic")
                probability = None
        if probability is None:
            probability = self._predict_heuristic(raw, features)
        alert = AlertCategorizer(threshold).categorize(probability)
        return PredictionResponse(flood_probability=round(probability, 4), engineered_features=features,
                                  model_type=mode, threshold_used=threshold, **alert)

    def predict(self, raw):
        return self.evaluate(raw).flood_probability

    @property
    def model_type(self):
        return self._model_type

    @property
    def threshold(self):
        return self._threshold

ml_service = MLService()
