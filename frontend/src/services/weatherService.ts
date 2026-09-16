export interface Prediction {
  flood_probability: number; risk_score: number; alert_level: 'SAFE' | 'ADVISORY' | 'WARNING' | 'CRITICAL';
  model_type: 'heuristic' | 'pipeline'; threshold_used: number; binary_prediction: number;
  recommended_action: string; engineered_features: Record<string, number>; assumptions?: string[];
}
export interface Weather {
  status: 'live' | 'unavailable'; message: string | null; cached: boolean; cached_at: string | null;
  latitude: number; longitude: number; elevation_m: number | null;
  current: { temperature_2m: number; precipitation: number; wind_speed_10m: number | null; condition_text: string; time: string } | null;
  daily: { precipitation_sum_7d: number; max_daily_rainfall: number; dates: string[]; rain_values: number[] } | null;
  soil: { saturation_pct: number } | null;
}
export interface Telemetry {
  id: string; status: 'live' | 'unavailable'; current_temp: number | null; rain_7d_mm: number | null;
  risk_tier: Prediction['alert_level'] | null; risk_score: number | null;
  prediction: Prediction | null; observed_at: string | null; assumptions: string[];
}
export interface DistrictSnapshot { generated_at: string; districts: Telemetry[] }
export interface Health { status: string; model_available: boolean; ml_model_type: string }
export interface RadarFrame { time: number; path: string; tile_url_template: string; kind: 'observed' | 'forecast' }
export interface Radar { status: 'live' | 'unavailable'; frames: RadarFrame[]; latest_frame: RadarFrame | null }
export interface Scenario { rainfall_7d_mm: number; elevation_m: number; distance_to_river_m: number; soil_saturation_pct: number; district: string }
const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 75000);
  try {
    const response = await fetch(`${BASE}${path}`, { ...options, signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options.headers } });
    if (!response.ok) throw new Error(`API request failed (${response.status}). ${response.status === 429 ? 'Please wait a minute.' : 'Check that the backend is running.'}`);
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) throw new Error('The API is unavailable. Start the backend on port 8000.');
    return await response.json() as T;
  } catch (error) {
    if (controller.signal.aborted && !options.signal?.aborted) throw new Error('The request timed out. Try refreshing.');
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}
export const simulate = (params: Scenario, signal?: AbortSignal) => api<Prediction>('/api/v1/simulate', {
  method: 'POST', body: JSON.stringify(params), signal,
});
export const timeLabel = (value?: string | null) => value ? new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo' }) + ' SLST' : 'No observation';
