import type { District } from '../data/sriLankaDistricts';
import type { Prediction, Scenario, Telemetry } from './weatherService';

export function riskLabel(level?: string | null) {
  return ({ SAFE: 'Lower experimental risk', ADVISORY: 'Moderate experimental risk', WARNING: 'High experimental risk', CRITICAL: 'Very high experimental risk' } as Record<string, string>)[level ?? ''] ?? 'Unavailable';
}

export function scenarioFromDistrict(district: District, reading?: Telemetry): Scenario {
  return {
    district: district.id,
    rainfall_7d_mm: reading?.rain_7d_mm ?? 50,
    elevation_m: Number(reading?.assessment_inputs?.elevation_m ?? district.elevation),
    distance_to_river_m: Number(reading?.assessment_inputs?.distance_to_river_m ?? 1000),
    soil_saturation_pct: reading?.soil_saturation_pct ?? 50,
  };
}

export function probabilityChange(current: Prediction, previous: Prediction): number | null {
  if (current.model_version !== previous.model_version || current.threshold_used !== previous.threshold_used) return null;
  return (current.flood_probability - previous.flood_probability) * 100;
}

export function changedInputs(current: Record<string, string | number>, previous: Record<string, string | number>) {
  return Object.entries(current).filter(([key, value]) => previous[key] !== undefined && previous[key] !== value)
    .map(([key, value]) => ({ key, before: previous[key], after: value }));
}

export const signed = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
export const dateLabel = (value: string) => new Date(value).toLocaleString('en-GB', {
  timeZone: 'Asia/Colombo', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
}) + ' SLST';
