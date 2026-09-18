"""Explicit assumptions for district weather scenarios; direct requests have no defaults."""
from app.models.schemas import PredictionRequest

ASSUMPTIONS = [
    'Weather is Open-Meteo model output, not local sensor observations. District coordinates/elevation are reference anchors.',
    'Rainfall windows are provider totals. Soil saturation is a proxy: surface moisture / 0.45, clipped to [0,1].',
    'Relative drainage height, drainage effectiveness, river distance, land cover and infrastructure are unverified scenario baselines unless supplied.',
    'The score is calibrated on balanced synthetic scenarios, not real-world flood prevalence. This is not an official warning.',
]

def baseline(district):
    return dict(district=district['name'], elevation_m=district['elevation_m'], distance_to_river_m=1000,
                landcover='Agriculture', soil_type='Loamy', water_supply='Municipal', electricity='Grid',
                road_quality='Fair', urban_rural='Rural', rainfall_7d_mm=50, rainfall_24h_mm=10,
                rainfall_30d_mm=175, height_above_nearest_drainage_m=5, soil_saturation_index=.4,
                drainage_index=.5, historical_flood_count=0, infrastructure_score=55,
                population_density_per_km2=1500, built_up_percent=35, nearest_hospital_km=5, nearest_evac_km=5)

def validated_baseline(district, **overrides):
    return PredictionRequest(**{**baseline(district), **overrides}).model_dump()

def input_sources(raw):
    sources = {key: 'Unverified scenario baseline' for key in raw}
    for key in ('district', 'elevation_m'):
        sources[key] = 'District reference'
    for key in ('rainfall_24h_mm', 'rainfall_7d_mm', 'rainfall_30d_mm'):
        sources[key] = 'Open-Meteo: completed daily precipitation totals ending yesterday'
    sources['soil_saturation_index'] = 'Proxy from current Open-Meteo surface soil moisture / 0.45'
    return sources
