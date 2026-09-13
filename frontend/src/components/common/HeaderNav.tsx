import { ShieldAlert, PhoneCall, Map, AlertTriangle, Navigation, Bell } from "lucide-react";

export type NavTab = "map" | "districts" | "tracker" | "register";

interface HeaderNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  hasActiveAlert?: boolean;
}

export default function HeaderNav({ activeTab, onTabChange, hasActiveAlert = true }: HeaderNavProps) {
  return (
    <header className="app-header">
      {/* Brand Identity */}
      <div className="brand-section">
        <div className="brand-icon-wrapper">
          <ShieldAlert className="brand-icon" size={24} />
        </div>
        <div>
          <h1 className="brand-title">FloodSentinel</h1>
          <p className="brand-subtitle">
            Sri Lanka Citizen Flood Early Warning & Live Doppler Radar
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="header-nav-tabs" aria-label="Main Navigation">
        <button
          className={`nav-tab-btn ${activeTab === "map" ? "active" : ""}`}
          onClick={() => onTabChange("map")}
        >
          <Map size={16} />
          <span>Live Radar Map</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === "districts" ? "active" : ""}`}
          onClick={() => onTabChange("districts")}
        >
          <AlertTriangle size={16} />
          <span>District Directory</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === "tracker" ? "active" : ""}`}
          onClick={() => onTabChange("tracker")}
        >
          <Navigation size={16} />
          <span>My Live Tracker</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === "register" ? "active" : ""}`}
          onClick={() => onTabChange("register")}
        >
          <Bell size={16} />
          <span>Alert Registration</span>
        </button>
      </nav>

      {/* Emergency Hotline & Status */}
      <div className="header-status-group">
        {hasActiveAlert && (
          <div className="national-alert-pill">
            <span className="pulsing-dot red"></span>
            <span className="alert-text">SW Monsoon Active — River Basins on Flood Alert</span>
          </div>
        )}

        <a href="tel:117" className="emergency-btn" title="Call DMC National Disaster Hotline 117">
          <PhoneCall size={14} />
          <span>Emergency 117</span>
        </a>
      </div>
    </header>
  );
}
