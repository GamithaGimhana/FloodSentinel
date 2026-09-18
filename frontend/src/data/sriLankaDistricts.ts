import registry from '../../../shared/districts.json';
export type RiskLevel = 'Safe' | 'Advisory' | 'Warning' | 'Critical';
export interface District {
  id: string; name: string; province: string; lat: number; lon: number;
  elevation: number; riverBasin: string; baseRisk: RiskLevel;
  nearestHospital: string; nearestEvacCenter: string;
}
export const SRI_LANKA_DISTRICTS = registry as District[];
export const SRI_LANKA_CENTER: [number, number] = [7.8731, 80.7718];
export const DEFAULT_ZOOM = 7;
