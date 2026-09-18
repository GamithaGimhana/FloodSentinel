"""Versioned, leakage-safe transformations shared by training and serving."""
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin, ClassifierMixin

CATEGORICAL = ['district', 'landcover', 'soil_type', 'water_supply', 'electricity', 'road_quality', 'urban_rural']
FEATURES = ['district', 'elevation_m', 'distance_to_river_m', 'landcover', 'soil_type',
    'water_supply', 'electricity', 'road_quality', 'population_density_per_km2',
    'built_up_percent', 'urban_rural', 'rainfall_7d_mm', 'drainage_index',
    'historical_flood_count', 'infrastructure_score', 'nearest_hospital_km',
    'nearest_evac_km', 'rainfall_24h_mm', 'rainfall_30d_mm',
    'height_above_nearest_drainage_m', 'soil_saturation_index']
ENGINEERED = ['hydrological_stress_index', 'drainage_saturation_ratio',
    'rainfall_intensity_ratio', 'river_proximity_buffer', 'log_population_density', 'runoff_vulnerability']

class FeatureBuilder(TransformerMixin, BaseEstimator):
    def fit(self, X, y=None):
        return self

    def transform(self, X):
        frame = pd.DataFrame([X]) if isinstance(X, dict) else pd.DataFrame(X)
        frame = frame.loc[:, FEATURES].copy()
        rain, drainage = frame.rainfall_7d_mm, frame.drainage_index
        frame['hydrological_stress_index'] = rain / (frame.height_above_nearest_drainage_m + 1)
        frame['drainage_saturation_ratio'] = rain * (1 - drainage)
        frame['rainfall_intensity_ratio'] = frame.rainfall_24h_mm / (rain + 1)
        frame['river_proximity_buffer'] = np.exp(-frame.distance_to_river_m / 1000)
        frame['log_population_density'] = np.log1p(frame.population_density_per_km2)
        frame['runoff_vulnerability'] = frame.built_up_percent / 100 / (drainage + .01)
        return frame

class CalibratedDecision(ClassifierMixin, BaseEstimator):
    def __init__(self, estimator, calibrator, threshold):
        self.estimator = estimator
        self.calibrator = calibrator
        self.threshold = threshold
        self.classes_ = np.array([0, 1])

    def fit(self, X, y=None):
        raise RuntimeError('Use the training entrypoint to fit and calibrate disjoint partitions')

    def __sklearn_is_fitted__(self):
        return True

    def predict_proba(self, X):
        probability = self.calibrator.predict(self.estimator.predict_proba(X)[:, 1])
        return np.column_stack([1 - probability, probability])

    def predict(self, X):
        return (self.predict_proba(X)[:, 1] >= self.threshold).astype(int)
