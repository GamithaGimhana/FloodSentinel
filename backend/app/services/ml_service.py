"""Inference against the trusted, self-contained notebook export. Never substitute a score."""
import json
import logging
import math
import os
from pathlib import Path
from threading import Lock
import cloudpickle
import numpy as np
from app.models.schemas import EngineeredFeatures, PredictionResponse
from app.services.alert_categorizer import AlertCategorizer

logger = logging.getLogger(__name__)
ROOT = Path(__file__).resolve().parents[3]
MODEL_PKL_PATH = Path(os.getenv('MODEL_PATH', str(ROOT / 'flood_alert_pipeline.pkl')))
MODEL_METADATA_PATH = Path(os.getenv('MODEL_METADATA_PATH', str(ROOT / 'model_metadata.json')))


class ModelUnavailable(RuntimeError):
    pass


class MLService:
    def __init__(self):
        self._pipeline = None
        self._threshold = None
        self.metadata = {}
        self.load_error = None
        self._lock = Lock()

    def load_pipeline(self):
        self._pipeline = None
        self._threshold = None
        self.metadata = {}
        self.load_error = None
        try:
            metadata = json.loads(MODEL_METADATA_PATH.read_text(encoding='utf-8'))
            threshold = float(metadata['decision_threshold'])
            if not math.isfinite(threshold) or not 0 < threshold < 1:
                raise ValueError('Invalid decision threshold')
            # Pickle executes code. Only load the trusted local export, never model uploads.
            with MODEL_PKL_PATH.open('rb') as handle:
                pipeline = cloudpickle.load(handle)
            if not np.array_equal(pipeline.classes_, [0, 1]):
                raise ValueError('Expected binary classifier classes [0, 1]')
            if not math.isclose(pipeline.named_steps['classifier'].threshold, threshold, abs_tol=1e-12):
                raise ValueError('Metadata threshold disagrees with exported classifier')
            probability = float(pipeline.predict_proba(metadata['sample_payloads']['high_risk_flood'])[0, 1])
            if not math.isfinite(probability) or not 0 <= probability <= 1:
                raise ValueError('Invalid smoke prediction')
            self._pipeline, self._threshold, self.metadata = pipeline, threshold, metadata
            return True
        except Exception as exc:
            self.load_error = str(exc)
            logger.exception('Model unavailable; prediction endpoints will return HTTP 503')
            return False

    def transform_features(self, raw):
        rain, elevation, drainage = raw['rainfall_7d_mm'], raw['elevation_m'], raw['drainage_index']
        return EngineeredFeatures(
            hydrological_stress_index=round(rain / (elevation + 1), 4),
            drainage_saturation_ratio=round(rain * (1 - drainage), 4),
            water_veg_contrast=round(raw['ndwi'] - raw['ndvi'], 4),
            river_proximity_buffer=round(math.exp(-raw['distance_to_river_m'] / 1000), 4),
            log_population_density=round(math.log1p(raw['population_density_per_km2']), 4),
            runoff_vulnerability=round((raw['built_up_percent'] / 100) / (drainage + .01), 4))

    def evaluate(self, raw):
        if self._pipeline is None:
            raise ModelUnavailable('Model unavailable. Check the trusted artifact and server logs.')
        try:
            # The pickle owns sanitizing, engineering, encoding and calibration.
            with self._lock:
                probability = float(self._pipeline.predict_proba(raw)[0, 1])
            if not math.isfinite(probability) or not 0 <= probability <= 1:
                raise ValueError('Invalid probability')
        except Exception as exc:
            logger.exception('Inference failed')
            raise ModelUnavailable('Model inference failed. No substitute score was generated.') from exc
        return PredictionResponse(flood_probability=probability,
            engineered_features=self.transform_features(raw), model_type='pipeline',
            threshold_used=self._threshold, model_version=self.metadata.get('version', 'unknown'),
            **AlertCategorizer(self._threshold).categorize(probability))

    @property
    def model_type(self):
        return 'pipeline' if self._pipeline is not None else 'unavailable'

    @property
    def threshold(self):
        return self._threshold


ml_service = MLService()
