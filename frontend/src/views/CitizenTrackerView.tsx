import { useState, useEffect } from "react";
import { Navigation, Loader2, AlertCircle, ShieldAlert, PhoneCall, Landmark, Droplets, Thermometer, Wind } from "lucide-react";
import { SRI_LANKA_DISTRICTS, District } from "../data/sriLankaDistricts";
import { fetchLiveWeather, estimateRealtimeRisk, LiveWeatherData, RealtimeRiskEstimate } from "../services/weatherService";

interface CurrentGPS {
  lat: number;
  lon: number;
  accuracy: number;
}

export default function CitizenTrackerView() {
  const [gps, setGps] = useState<CurrentGPS | null>(null);
  const [locating, setLocating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [closestDistrict, setClosestDistrict] = useState<District>(SRI_LANKA_DISTRICTS[0]);
  const [weather, setWeather] = useState<LiveWeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);

  // Find closest district from coordinates
  const findClosestDistrict = (lat: number, lon: number): District => {
    let best = SRI_LANKA_DISTRICTS[0];
    let minDistance = Infinity;

    for (const d of SRI_LANKA_DISTRICTS) {
      const dist = Math.sqrt(Math.pow(d.lat - lat, 2) + Math.pow(d.lon - lon, 2));
      if (dist < minDistance) {
        minDistance = dist;
        best = d;
      }
    }
    return best;
  };

  const handleTrackCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser");
      return;
    }

    setLocating(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        setGps({ lat: latitude, lon: longitude, accuracy });

        const district = findClosestDistrict(latitude, longitude);
        setClosestDistrict(district);

        setLoadingWeather(true);
        const weatherData = await fetchLiveWeather(latitude, longitude);
        setWeather(weatherData);
        setLoadingWeather(false);
      },
      (err) => {
        setLocating(false);
        setErrorMsg("GPS access denied or timed out. Defaulting to Colombo Western Basin.");
        console.warn("Geolocation tracker error:", err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Initial load
  useEffect(() => {
    handleTrackCurrentLocation();
  }, []);

  const risk: RealtimeRiskEstimate = estimateRealtimeRisk(
    closestDistrict.elevation,
    weather?.rainfall7dMm ?? 110,
    600
  );

  const riskClass = risk.level.toLowerCase();

  const actionText =
    risk.level === "Critical"
      ? "Imminent water inundation! Low-lying river areas must prepare for immediate evacuation."
      : risk.level === "Warning"
      ? "Elevated flood warning. Pack emergency supplies and monitor river levels."
      : risk.level === "Advisory"
      ? "Moderate catchment rainfall. Keep drains clear and follow advisories."
      : "Hydrological conditions safe. Normal seasonal precautions apply.";

  return (
    <div className="tracker-view-container">
      <div className="view-hero-header">
        <div>
          <h2 className="view-hero-title">Citizen Live Location & Risk Tracker</h2>
          <p className="view-hero-desc">
            Monitor real-time flood probability, cumulative rainfall, and river catchment inundation risks at your current GPS location.
          </p>
        </div>

        <button
          onClick={handleTrackCurrentLocation}
          disabled={locating}
          className="locate-live-btn"
        >
          {locating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Acquiring GPS Satellite Lock...</span>
            </>
          ) : (
            <>
              <Navigation size={16} />
              <span>Refresh My Live GPS Location</span>
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="tracker-warning-banner">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Risk Status Hero Card */}
      <div className={`tracker-risk-hero card-border-${riskClass}`}>
        <div className="tracker-hero-top">
          <div className="tracker-coord-pill">
            <span className="live-pulsing-badge"></span>
            <span>
              {gps
                ? `GPS: ${gps.lat.toFixed(4)}° N, ${gps.lon.toFixed(4)}° E (±${Math.round(gps.accuracy)}m)`
                : `Reference: ${closestDistrict.lat}° N, ${closestDistrict.lon}° E`}
            </span>
          </div>

          <span className={`tracker-risk-badge badge-${riskClass}`}>
            {risk.level} Warning Tier
          </span>
        </div>

        <div className="tracker-prob-display">
          <div>
            <span className="tracker-subhead">Nearest Administrative Basin</span>
            <h3 className="tracker-district-name">
              {closestDistrict.name} District ({closestDistrict.riverBasin})
            </h3>
          </div>

          <div className="prob-meter">
            <span className="prob-number">{risk.score}%</span>
            <span className="prob-label">Flood Inundation Probability</span>
          </div>
        </div>

        <p className="tracker-action-msg">{actionText}</p>

        {/* Action checklist based on risk */}
        <div className="tracker-safety-steps">
          <h4 className="safety-steps-title">
            <ShieldAlert size={16} />
            <span>Recommended Citizen Safety Actions</span>
          </h4>
          <ul className="safety-steps-list">
            {risk.level === "Critical" ? (
              <>
                <li>🚨 <strong>Immediate Relocation:</strong> Move elderly, children, and essential belongings to high ground or designated evacuation camps immediately.</li>
                <li>⚡ <strong>Utility Safety:</strong> Turn off main electrical switches and gas valves before floodwaters enter your premises.</li>
                <li>🚫 <strong>Floodwater Caution:</strong> Never walk, swim, or drive through moving flood waters (as little as 30cm of flowing water can sweep away vehicles).</li>
              </>
            ) : risk.level === "Warning" ? (
              <>
                <li>🎒 <strong>Pack Emergency Go-Bag:</strong> Pack 3 days of water, non-perishable food, flashlight, medicines, and waterproofed identification documents.</li>
                <li>📱 <strong>Keep Phones Charged:</strong> Maintain full battery charge and monitor real-time weather radar bulletins.</li>
                <li>🚗 <strong>Relocate Vehicles:</strong> Move vehicles from underground parking or low-lying road corridors.</li>
              </>
            ) : (
              <>
                <li>✅ <strong>Normal Precautions:</strong> Your immediate area is currently in a safe/moderate buffer. Stay tuned to monsoon alerts.</li>
                <li>🔍 <strong>Inspect Drain Channels:</strong> Ensure neighborhood rainwater drains and culverts remain free of debris.</li>
              </>
            )}
          </ul>
        </div>
      </div>

      {/* Live Meteorological Data Grid */}
      <div className="tracker-metrics-grid">
        <div className="tracker-metric-card">
          <div className="metric-header">
            <Thermometer size={16} className="text-amber-400" />
            <span>Air Temperature</span>
          </div>
          <span className="metric-value">
            {loadingWeather ? "..." : `${weather?.temperatureC ?? 27.2}°C`}
          </span>
          <span className="metric-hint">Open-Meteo Ingest</span>
        </div>

        <div className="tracker-metric-card">
          <div className="metric-header">
            <Droplets size={16} className="text-blue-400" />
            <span>Instant Rainfall</span>
          </div>
          <span className="metric-value">
            {loadingWeather ? "..." : `${weather?.currentPrecipitationMm ?? 0.2} mm/h`}
          </span>
          <span className="metric-hint">{weather?.weatherDescription ?? "Moderate Overcast"}</span>
        </div>

        <div className="tracker-metric-card">
          <div className="metric-header">
            <Droplets size={16} className="text-cyan-400" />
            <span>7-Day Cumulative Rain</span>
          </div>
          <span className="metric-value">
            {loadingWeather ? "..." : `${weather?.rainfall7dMm ?? 94} mm`}
          </span>
          <span className="metric-hint">Soil Saturation Proxy</span>
        </div>

        <div className="tracker-metric-card">
          <div className="metric-header">
            <Wind size={16} className="text-emerald-400" />
            <span>Wind Speed</span>
          </div>
          <span className="metric-value">
            {loadingWeather ? "..." : `${weather?.windSpeedKmh ?? 14} km/h`}
          </span>
          <span className="metric-hint">Monsoon Gale Velocity</span>
        </div>
      </div>

      {/* Emergency Points & Hotlines Card */}
      <div className="tracker-evac-card">
        <div className="evac-info-col">
          <h4 className="evac-section-title">
            <Landmark size={18} />
            <span>Designated Safe Evacuation Assembly Point</span>
          </h4>
          <p className="evac-name">{closestDistrict.nearestEvacCenter}</p>
          <p className="evac-sub">
            District Medical Referral: <strong>{closestDistrict.nearestHospital}</strong>
          </p>
        </div>

        <div className="evac-action-col">
          <a href="tel:117" className="evac-call-btn red">
            <PhoneCall size={16} />
            <span>Call DMC Hotline (117)</span>
          </a>
          <a href="tel:1990" className="evac-call-btn blue">
            <PhoneCall size={16} />
            <span>Suwa Seriya Ambulance (1990)</span>
          </a>
        </div>
      </div>
    </div>
  );
}
