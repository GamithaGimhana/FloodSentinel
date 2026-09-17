"""Explicit demonstration baselines shared by weather views and the scenario lab."""
from app.models.schemas import PredictionRequest

ASSUMPTIONS = [
    'Weather comes from Open-Meteo model estimates, not local sensors. District coordinates/elevation are references.',
    'Drainage and NDWI are soil-moisture proxies; monthly rainfall is seven-day rainfall multiplied by 3.5.',
    'River distance, land cover, soil, utilities, demographics, flood history and facility distances use demonstration baselines unless supplied.',
    'The model was trained on synthetic data. This is not an official warning or validated forecast.',
]

def baseline(district):
    return dict(district=district['name'], latitude=district['lat'], longitude=district['lon'],
                elevation_m=district['elevation_m'], distance_to_river_m=1000,
                landcover='Agriculture', soil_type='Loamy', water_supply='Municipal', electricity='Grid',
                road_quality='Fair', urban_rural='Rural', rainfall_7d_mm=50, monthly_rainfall_mm=175,
                drainage_index=.5, ndvi=.32, ndwi=.4, water_presence_flag='Likely',
                historical_flood_count=0, infrastructure_score=55, population_density_per_km2=1500,
                built_up_percent=35, nearest_hospital_km=5, nearest_evac_km=5)

def validated_baseline(district, **overrides):
    return PredictionRequest(**{**baseline(district), **overrides}).model_dump()
