"""Inference against the trusted, self-contained notebook export. Never substitute a score."""
import json
import hashlib
import sklearn
import logging
import math
import os
from pathlib import Path
from threading import Lock
import cloudpickle
import numpy as np
from app.models.schemas import EngineeredFeatures, PredictionResponse
from app.services.alert_categorizer import AlertCategorizer
from app.services.model_pipeline import FEATURES, ENGINEERED, FeatureBuilder

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
            if metadata.get('schema_version') != 2 or metadata.get('features') != FEATURES:
                raise ValueError('Incompatible model feature contract; retrain with scripts/train_model.py')
            if metadata['runtime']['sklearn'] != sklearn.__version__:
                raise ValueError('Training and serving scikit-learn versions differ')
            if hashlib.sha256(MODEL_PKL_PATH.read_bytes()).hexdigest() != metadata['artifact_sha256']:
                raise ValueError('Model artifact checksum mismatch')
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
        features = FeatureBuilder().transform(raw).iloc[0]
        return EngineeredFeatures(**{key: round(float(features[key]), 4) for key in ENGINEERED})

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
            input_warnings=[f'{key} is outside the training range [{bounds["min"]}, {bounds["max"]}]'
                for key, bounds in self.metadata.get('numeric_training_ranges', {}).items()
                if not bounds['min'] <= raw[key] <= bounds['max']],
            threshold_used=self._threshold, model_version=self.metadata.get('version', 'unknown'),
            **AlertCategorizer(self._threshold).categorize(probability))

    @property
    def model_type(self):
        return 'pipeline' if self._pipeline is not None else 'unavailable'

    @property
    def threshold(self):
        return self._threshold


ml_service = MLService()
