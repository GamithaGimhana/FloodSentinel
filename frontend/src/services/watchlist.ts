import { SRI_LANKA_DISTRICTS } from '../data/sriLankaDistricts';
export const KEY = 'floodsentinel_saved_districts_v1';
export function readSavedPlaces(): string[] {
  try { const data: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(data) ? [...new Set(data.filter((x): x is string => typeof x === 'string' && SRI_LANKA_DISTRICTS.some(d => d.id === x)))].slice(0, 25) : []; } catch { return []; }
}
