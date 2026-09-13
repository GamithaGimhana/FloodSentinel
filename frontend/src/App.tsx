import React, { useState, useEffect } from "react";
import FloodMap from "./components/map/FloodMap";
import RadarOverlay from "./components/map/RadarOverlay";
import { District, SRI_LANKA_DISTRICTS } from "./data/sriLankaDistricts";
import {
  fetchLiveWeather,
  estimateRealtimeRisk,
  LiveWeatherData,
  RealtimeRiskEstimate,
} from "./services/weatherService";
import { FoundLocation } from "./components/map/LocationFinder";
import {
  ShieldAlert,
  Droplets,
  Wind,
  Thermometer,
  CloudRain,
  PhoneCall,
  Landmark,
  Compass,
  AlertTriangle,
  Info,
} from "lucide-react";

export default function App() {
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(
    SRI_LANKA_DISTRICTS[0] // Default to Colombo
  );
  const [customLocation, setCustomLocation] = useState<FoundLocation | { lat: number; lon: number } | null>(null);
  const [weatherData, setWeatherData] = useState<LiveWeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);

  // Active target coordinates: either custom clicked/GPS location or selected district
  const activeLat = customLocation ? customLocation.lat : selectedDistrict?.lat ?? 6.9271;
  const activeLon = customLocation ? customLocation.lon : selectedDistrict?.lon ?? 79.8612;
  const activeElevation = selectedDistrict ? selectedDistrict.elevation : 15;
  const activeBasin = selectedDistrict ? selectedDistrict.riverBasin : "Regional River Catchment";
  const activeShelter = selectedDistrict
    ? selectedDistrict.nearestEvacCenter
    : "Nearest District General High-Ground Assembly";
  const activeHospital = selectedDistrict
    ? selectedDistrict.nearestHospital
    : "Regional Base Hospital";

  // Fetch live Open-Meteo weather when location changes
  useEffect(() => {
    let isMounted = true;
    async function loadWeather() {
      setLoadingWeather(true);
      const data = await fetchLiveWeather(activeLat, activeLon);
      if (isMounted) {
        setWeatherData(data);
        setLoadingWeather(false);
      }
    }

    loadWeather();
    return () => {
      isMounted = false;
    };
  }, [activeLat, activeLon]);

  // Compute real-time flood risk evaluation
  const riskEstimate: RealtimeRiskEstimate = estimateRealtimeRisk(
    activeElevation,
    weatherData?.rainfall7dMm ?? 110,
    selectedDistrict ? 600 : 1200
  );

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = SRI_LANKA_DISTRICTS.find((d) => d.id === e.target.value);
    if (found) {
      setSelectedDistrict(found);
      setCustomLocation(null);
    }
  };

  return (
    <div className="flood-app-container">
      {/* Top Navigation Bar */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon-wrapper">
            <ShieldAlert className="brand-icon" size={24} />
          </div>
          <div>
            <h1 className="brand-title">FloodSentinel</h1>
            <p className="brand-subtitle">
              Sri Lanka Flood Early Warning & Live Doppler Radar System
            </p>
          </div>
        </div>

        {/* Top Status & Emergency Call */}
        <div className="header-status-group">
          <div className="national-alert-pill">
            <span className="pulsing-dot red"></span>
            <span>SW Monsoon Active — Western & Sabaragamuwa Basins on Alert</span>
          </div>

          <a href="tel:117" className="emergency-hotline-btn" title="DMC National Disaster Hotline">
            <PhoneCall size={14} />
            <span>Emergency 117</span>
          </a>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="dashboard-grid">
        {/* Left / Center Map Section */}
        <section className="map-view-section">
          <FloodMap
            selectedDistrict={selectedDistrict}
            onSelectDistrict={(district) => {
              setSelectedDistrict(district);
              setCustomLocation(null);
            }}
            customLocation={customLocation}
            onCustomLocationSelect={(loc) => {
              setCustomLocation(loc);
              setSelectedDistrict(null);
            }}
          >
            {/* Live Animated RainViewer Radar Layer */}
            <RadarOverlay />
          </FloodMap>
        </section>

        {/* Right Inspection & Metrics Panel */}
        <aside className="intelligence-panel">
          {/* District Quick Switcher */}
          <div className="panel-card district-switcher-card">
            <label htmlFor="district-select" className="panel-label">
              <Compass size={14} />
              <span>Select Administrative District</span>
            </label>
            <select
              id="district-select"
              className="district-dropdown"
              value={selectedDistrict?.id ?? ""}
              onChange={handleDistrictChange}
            >
              <option value="" disabled>
                {customLocation ? "Custom Coordinate Selected" : "Choose a district..."}
              </option>
              {SRI_LANKA_DISTRICTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.province} Province) — {d.baseRisk} Risk
                </option>
              ))}
            </select>
          </div>

          {/* Real-time Risk Level Meter */}
          <div className="panel-card risk-meter-card">
            <div className="card-top-row">
              <h3 className="card-title">Real-Time Flood Alert Status</h3>
              <span className={`risk-tag tag-${riskEstimate.level.toLowerCase()}`}>
                {riskEstimate.level} Alert
              </span>
            </div>

            <div className="meter-display">
              <div className="score-circle" style={{ borderColor: riskEstimate.color }}>
                <span className="score-num" style={{ color: riskEstimate.color }}>
                  {riskEstimate.score}%
                </span>
                <span className="score-label">Risk Probability</span>
              </div>

              <div className="risk-description">
                {riskEstimate.level === "Critical" && (
                  <p className="risk-text text-red">
                    <AlertTriangle size={15} /> Imminent water inundation! Low-lying river areas must prepare for evacuation.
                  </p>
                )}
                {riskEstimate.level === "Warning" && (
                  <p className="risk-text text-orange">
                    <AlertTriangle size={15} /> Severe runoff saturation. Secure livestock, power, and vital documents.
                  </p>
                )}
                {riskEstimate.level === "Advisory" && (
                  <p className="risk-text text-yellow">
                    <Info size={15} /> Moderate accumulation. Monitor DMC river gauges for Kelani & Kalu basins.
                  </p>
                )}
                {riskEstimate.level === "Safe" && (
                  <p className="risk-text text-green">
                    <Info size={15} /> Current precipitation within safe regional absorption margins.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Live Open-Meteo Weather Observations */}
          <div className="panel-card weather-metrics-card">
            <div className="card-top-row">
              <h3 className="card-title">Live Weather Radar Ingestion</h3>
              <small className="update-tag">
                {loadingWeather ? "Updating..." : `Live API: ${weatherData?.lastUpdated ?? "Online"}`}
              </small>
            </div>

            <div className="metrics-grid">
              <div className="metric-box">
                <Thermometer size={16} className="metric-icon text-amber-400" />
                <div className="metric-info">
                  <span className="metric-val">{weatherData?.temperatureC ?? 28}°C</span>
                  <span className="metric-lbl">Air Temp</span>
                </div>
              </div>

              <div className="metric-box">
                <CloudRain size={16} className="metric-icon text-sky-400" />
                <div className="metric-info">
                  <span className="metric-val">{weatherData?.currentPrecipitationMm ?? 0.0} mm/h</span>
                  <span className="metric-lbl">Rain Rate</span>
                </div>
              </div>

              <div className="metric-box">
                <Droplets size={16} className="metric-icon text-blue-400" />
                <div className="metric-info">
                  <span className="metric-val">{weatherData?.rainfall7dMm ?? 0} mm</span>
                  <span className="metric-lbl">7-Day Rainfall</span>
                </div>
              </div>

              <div className="metric-box">
                <Wind size={16} className="metric-icon text-teal-400" />
                <div className="metric-info">
                  <span className="metric-val">{weatherData?.windSpeedKmh ?? 12} km/h</span>
                  <span className="metric-lbl">Wind Speed</span>
                </div>
              </div>
            </div>

            <div className="weather-condition-pill">
              <span>Conditions: <strong>{weatherData?.weatherDescription ?? "Analyzing weather..."}</strong></span>
            </div>
          </div>

          {/* Safety & Evacuation Guidance */}
          <div className="panel-card safety-guidance-card">
            <h3 className="card-title">Evacuation & Safety Points</h3>
            <ul className="safety-list">
              <li>
                <Landmark size={14} className="safety-icon" />
                <div>
                  <span className="safety-lbl">Designated Evacuation Shelter</span>
                  <p className="safety-val">{activeShelter}</p>
                </div>
              </li>
              <li>
                <ShieldAlert size={14} className="safety-icon" />
                <div>
                  <span className="safety-lbl">Nearest Medical Hospital</span>
                  <p className="safety-val">{activeHospital}</p>
                </div>
              </li>
              <li>
                <Droplets size={14} className="safety-icon" />
                <div>
                  <span className="safety-lbl">Primary River Basin</span>
                  <p className="safety-val">{activeBasin} (Elev. ~{activeElevation}m)</p>
                </div>
              </li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
