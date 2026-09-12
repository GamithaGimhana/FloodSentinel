/**
 * Open-Meteo Weather Service Client (TypeScript)
 * Fetches real-time precipitation, 7-day cumulative rainfall, soil moisture,
 * and current conditions for any geographic coordinate in Sri Lanka.
 * API: Free, open-access, zero authentication key needed.
 */

export interface LiveWeatherData {
  latitude: number;
  longitude: number;
  temperatureC: number;
  feelsLikeC: number;
  humidityPercent: number;
  currentPrecipitationMm: number;
  currentRainMm: number;
  rainfall7dMm: number;
  windSpeedKmh: number;
  weatherCode: number;
  weatherDescription: string;
  isRaining: boolean;
  lastUpdated: string;
  isFallback?: boolean;
}

export interface RealtimeRiskEstimate {
  score: number;
  level: "Safe" | "Advisory" | "Warning" | "Critical";
  color: string;
}

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";

// In-memory cache to avoid duplicate network calls within 5 minutes
const weatherCache = new Map<string, { data: LiveWeatherData; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Fetch live weather & rainfall measurements by GPS latitude and longitude.
 */
export async function fetchLiveWeather(
  latitude: number,
  longitude: number
): Promise<LiveWeatherData> {
  const cacheKey = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  const now = Date.now();

  if (weatherCache.has(cacheKey)) {
    const cached = weatherCache.get(cacheKey)!;
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m",
    daily: "precipitation_sum,rain_sum,precipitation_hours",
    timezone: "Asia/Colombo",
    past_days: "6", // Fetch past 6 days + today = 7 days cumulative rainfall!
    forecast_days: "1",
  });

  try {
    const response = await fetch(`${OPEN_METEO_BASE}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Open-Meteo API returned HTTP ${response.status}`);
    }

    const json = await response.json();

    // 7-day cumulative rainfall calculation
    const dailyRainfallArray: number[] = json.daily?.precipitation_sum || [];
    const rainfall7dMm = dailyRainfallArray.reduce((acc, val) => acc + (val || 0), 0);

    const current = json.current || {};
    const weatherCode: number = current.weather_code ?? 0;

    const data: LiveWeatherData = {
      latitude,
      longitude,
      temperatureC: current.temperature_2m ?? 28.0,
      feelsLikeC: current.apparent_temperature ?? 31.0,
      humidityPercent: current.relative_humidity_2m ?? 80,
      currentPrecipitationMm: current.precipitation ?? 0.0,
      currentRainMm: current.rain ?? 0.0,
      rainfall7dMm: Number(rainfall7dMm.toFixed(1)),
      windSpeedKmh: current.wind_speed_10m ?? 12.0,
      weatherCode,
      weatherDescription: decodeWmoWeatherCode(weatherCode),
      isRaining: (current.precipitation ?? 0) > 0.2,
      lastUpdated: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    weatherCache.set(cacheKey, { data, timestamp: now });
    return data;
  } catch (error) {
    console.warn("Falling back to simulated meteorological values due to API network error:", error);
    return {
      latitude,
      longitude,
      temperatureC: 28.4,
      feelsLikeC: 32.1,
      humidityPercent: 82,
      currentPrecipitationMm: 1.4,
      currentRainMm: 1.4,
      rainfall7dMm: 98.6,
      windSpeedKmh: 14.2,
      weatherCode: 61,
      weatherDescription: "Slight Rain (Monsoon)",
      isRaining: true,
      lastUpdated: new Date().toLocaleTimeString(),
      isFallback: true,
    };
  }
}

/**
 * Decodes WMO weather code into human-readable description.
 */
export function decodeWmoWeatherCode(code: number): string {
  if (code === 0) return "Clear Sky";
  if (code === 1 || code === 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code >= 45 && code <= 48) return "Foggy / Mist";
  if (code >= 51 && code <= 55) return "Light Drizzle";
  if (code >= 61 && code <= 65) return "Monsoon Rain";
  if (code >= 80 && code <= 82) return "Torrential Rain Showers";
  if (code >= 95 && code <= 99) return "Severe Thunderstorm";
  return "Cloudy";
}

/**
 * Heuristics estimation of real-time flood risk based on live weather & terrain.
 */
export function estimateRealtimeRisk(
  elevation: number,
  rainfall7d: number,
  distanceToRiver: number = 1000
): RealtimeRiskEstimate {
  const stress = rainfall7d / (Math.max(5, elevation) + 1);
  const riverFactor = Math.exp(-distanceToRiver / 1200);

  const rawScore = Math.min(100, Math.max(5, stress * 28 + riverFactor * 35));
  let level: RealtimeRiskEstimate["level"] = "Safe";
  let color = "#10b981"; // green

  if (rawScore > 75) {
    level = "Critical";
    color = "#ef4444"; // red
  } else if (rawScore > 55) {
    level = "Warning";
    color = "#f97316"; // orange
  } else if (rawScore > 30) {
    level = "Advisory";
    color = "#eab308"; // yellow
  }

  return { score: Math.round(rawScore), level, color };
}
