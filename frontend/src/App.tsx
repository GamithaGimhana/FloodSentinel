import React, { useState, useEffect } from "react";
import HeaderNav, { NavTab } from "./components/common/HeaderNav";
import FloodMap from "./components/map/FloodMap";
import RadarOverlay from "./components/map/RadarOverlay";
import DistrictsView from "./views/DistrictsView";
import CitizenTrackerView from "./views/CitizenTrackerView";
import RegistrationView from "./views/RegistrationView";
import AlertEvacDashboardView from "./views/AlertEvacDashboardView";
import { District, SRI_LANKA_DISTRICTS } from "./data/sriLankaDistricts";
import {
  fetchLiveWeather,
  estimateRealtimeRisk,
  LiveWeatherData,
  RealtimeRiskEstimate,
} from "./services/weatherService";
import { FoundLocation } from "./components/map/LocationFinder";
import {
  Droplets,
  Wind,
  Thermometer,
  CloudRain,
  PhoneCall,
  Landmark,
  Compass,
  Hospital,
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("map");
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

  const riskClass = riskEstimate.level.toLowerCase();

  const actionText =
    riskEstimate.level === "Critical"
      ? "Imminent flood inundation! Low-lying river basin areas should prepare for immediate evacuation."
      : riskEstimate.level === "Warning"
      ? "Elevated flood alert. Prepare emergency go-bag and monitor river water levels closely."
      : riskEstimate.level === "Advisory"
      ? "Moderate hydrological stress. Keep drainage channels clear and stay updated."
      : "Hydrological conditions stable. Normal seasonal precautions apply.";

  return (
    <div className="flood-app-container">
      {/* Top Citizen Navigation Bar with SPA Tabs */}
      <HeaderNav
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        hasActiveAlert={true}
      />

      {/* Main Multi-Page Views */}
      {activeTab === "map" && (
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
              {/* Free RainViewer Live Animated Doppler Radar Overlay */}
              <RadarOverlay />
            </FloodMap>
          </section>

          {/* Right Citizen Intelligence Panel */}
          <aside className="intelligence-panel">
            {/* District Quick Switcher */}
            <div className="panel-card district-switcher-card">
              <label htmlFor="district-select" className="panel-label">
                <Compass size={15} />
                <span>Select Administrative District</span>
              </label>
              <select
                id="district-select"
                className="district-dropdown"
                value={selectedDistrict?.id ?? ""}
                onChange={handleDistrictChange}
              >
                <option value="" disabled>
                  {customLocation ? "Custom GPS Location Active" : "Choose a district..."}
                </option>
                {SRI_LANKA_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.province} Province) — {d.baseRisk} Risk
                  </option>
                ))}
              </select>
            </div>

            {/* Real-time Risk Level Meter */}
            <div className={`panel-card risk-meter-card border-top-${riskClass}`}>
              <div className="card-top-row">
                <div>
                  <span className="card-sub-tag">Hydrological Risk Tier</span>
                  <h3 className="card-title">{selectedDistrict ? selectedDistrict.name : "Custom Spot"}</h3>
                </div>
                <span className={`risk-tag tag-${riskClass}`}>
                  {riskEstimate.level} Alert
                </span>
              </div>

              <div className="risk-score-wrapper">
                <div className="score-number-box">
                  <span className="risk-score-number">{riskEstimate.score}%</span>
                  <span className="risk-score-label">Inundation Likelihood</span>
                </div>
                <p className="risk-summary-text">{actionText}</p>
              </div>
            </div>

            {/* Live Weather Metrics from Open-Meteo */}
            <div className="panel-card weather-card">
              <div className="card-top-row">
                <h4 className="card-heading">
                  <CloudRain size={16} />
                  <span>Live Doppler Meteorological Readings</span>
                </h4>
                <span className="weather-live-indicator">
                  <span className="live-dot"></span> Open-Meteo Live
                </span>
              </div>

              <div className="weather-metrics-grid">
                <div className="weather-item">
                  <div className="weather-icon-label">
                    <Thermometer size={14} className="text-amber-400" />
                    <span>Air Temp</span>
                  </div>
                  <span className="weather-val">
                    {loadingWeather ? "..." : `${weatherData?.temperatureC ?? 27}°C`}
                  </span>
                </div>

                <div className="weather-item">
                  <div className="weather-icon-label">
                    <Droplets size={14} className="text-sky-400" />
                    <span>Rainfall Rate</span>
                  </div>
                  <span className="weather-val">
                    {loadingWeather ? "..." : `${weatherData?.currentPrecipitationMm ?? 0.1} mm/h`}
                  </span>
                </div>

                <div className="weather-item">
                  <div className="weather-icon-label">
                    <Droplets size={14} className="text-blue-400" />
                    <span>7-Day Rain</span>
                  </div>
                  <span className="weather-val">
                    {loadingWeather ? "..." : `${weatherData?.rainfall7dMm ?? 52} mm`}
                  </span>
                </div>

                <div className="weather-item">
                  <div className="weather-icon-label">
                    <Wind size={14} className="text-teal-400" />
                    <span>Wind Velocity</span>
                  </div>
                  <span className="weather-val">
                    {loadingWeather ? "..." : `${weatherData?.windSpeedKmh ?? 12} km/h`}
                  </span>
                </div>
              </div>

              <div className="weather-condition-footer">
                <span>Sky Conditions: <strong>{weatherData?.weatherDescription ?? "Overcast Drizzle"}</strong></span>
              </div>
            </div>

            {/* Evacuation & Shelter Intelligence */}
            <div className="panel-card shelter-card">
              <h4 className="card-heading">
                <Landmark size={16} />
                <span>Designated Safety & Relief Center</span>
              </h4>
              <p className="shelter-name">
                {selectedDistrict?.nearestEvacCenter ?? "District High-Ground Relief Center"}
              </p>

              <div className="hospital-row">
                <Hospital size={14} className="text-emerald-400" />
                <span>Nearest Base Hospital: <strong>{selectedDistrict?.nearestHospital ?? "Regional Base Hospital"}</strong></span>
              </div>

              <div className="basin-row">
                <Droplets size={14} className="text-blue-400" />
                <span>Catchment River Basin: <strong>{selectedDistrict?.riverBasin ?? "Regional Basin"}</strong></span>
              </div>
            </div>

            {/* Emergency Hotline Button */}
            <div className="panel-card hotline-card">
              <div className="hotline-text-col">
                <span className="hotline-title">Need Immediate Rescue or Assistance?</span>
                <span className="hotline-sub">Disaster Management Centre 24/7 Operations</span>
              </div>
              <a href="tel:117" className="hotline-action-btn">
                <PhoneCall size={16} />
                <span>Call 117</span>
              </a>
            </div>
          </aside>
        </main>
      )}

      {activeTab === "alerts" && <AlertEvacDashboardView />}

      {activeTab === "districts" && (
        <DistrictsView
          onSelectDistrictAndNavigate={(district) => {
            setSelectedDistrict(district);
            setCustomLocation(null);
            setActiveTab("map");
          }}
        />
      )}

      {activeTab === "tracker" && <CitizenTrackerView />}

      {activeTab === "register" && (
        <RegistrationView
          onNavigateToMap={(districtId) => {
            const found = SRI_LANKA_DISTRICTS.find((d) => d.id === districtId);
            if (found) {
              setSelectedDistrict(found);
              setCustomLocation(null);
            }
            setActiveTab("map");
          }}
        />
      )}
    </div>
  );
}
