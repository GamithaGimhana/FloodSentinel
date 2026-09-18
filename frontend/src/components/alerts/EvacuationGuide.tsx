import { useState } from "react";
import { Landmark, Hospital, PhoneCall, ShieldAlert, CheckSquare, Square, Navigation, MapPin } from "lucide-react";

export interface EvacuationGuideProps {
  districtName?: string;
  shelterName?: string;
  shelterDistanceKm?: number;
  hospitalName?: string;
  hospitalDistanceKm?: number;
  riverBasin?: string;
}

const DEFAULT_CHECKLIST = [
  { id: "docs", label: "National ID cards, birth certificates & deeds in waterproof pouch", checked: true },
  { id: "water", label: "3-day supply of sealed bottled drinking water (3L per person/day)", checked: true },
  { id: "food", label: "Dry rations & non-perishable canned food (with manual opener)", checked: false },
  { id: "meds", label: "Essential prescription medicines, asthma inhalers & basic first-aid kit", checked: true },
  { id: "light", label: "High-power LED flashlight, spare batteries & emergency candles", checked: false },
  { id: "power", label: "Fully charged mobile phone, backup power banks & charging cables", checked: false },
  { id: "cash", label: "Emergency cash in small denominations (ATMs may lose grid power)", checked: false },
];

/**
 * EvacuationGuide Component (TypeScript)
 * Member B: Evacuation & Safety Lead
 *
 * Emergency evacuation cards displaying distance to nearest hospital,
 * shelter point, and national disaster hotlines.
 */
export default function EvacuationGuide({
  districtName = "Colombo",
  shelterName = "Sugathadasa Indoor Stadium Relief Camp",
  shelterDistanceKm = 3.2,
  hospitalName = "National Hospital of Sri Lanka (NHSL)",
  hospitalDistanceKm = 4.1,
  riverBasin = "Kelani Ganga Catchment",
}: EvacuationGuideProps) {
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);

  const toggleCheck = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const completedCount = checklist.filter((i) => i.checked).length;
  const progressPercent = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="evacuation-guide-container">
      {/* Top Section Header */}
      <div className="evac-guide-header">
        <div className="evac-header-title-box">
          <Navigation className="text-sky-400" size={20} />
          <div>
            <h3 className="evac-guide-title">
              Citizen Evacuation & Safe Haven Protocol — {districtName}
            </h3>
            <p className="evac-guide-subtitle">
              Pre-authorized Disaster Management Centre (DMC) shelters, trauma referral units, and travel guidelines for {riverBasin}.
            </p>
          </div>
        </div>

        <div className="evac-badge-pill">
          <span className="live-dot"></span>
          <span>DMC Active Corridor</span>
        </div>
      </div>

      {/* Grid: 1. Designated Shelter | 2. Emergency Hospital */}
      <div className="evac-cards-grid">
        {/* Card 1: Shelter */}
        <div className="evac-spot-card shelter-border">
          <div className="spot-card-top">
            <div className="spot-icon-wrap shelter-bg">
              <Landmark size={20} className="text-sky-400" />
            </div>
            <span className="spot-distance-badge">
              <MapPin size={12} /> {shelterDistanceKm} km away
            </span>
          </div>

          <span className="spot-role-tag">Designated Evacuation Assembly</span>
          <h4 className="spot-name">{shelterName}</h4>
          <p className="spot-description">
            Reinforced concrete auditorium above the 100-year flood line. Equipped with emergency drinking water, dry food storage, and Sri Lanka Red Cross emergency triage.
          </p>

          <div className="spot-card-footer">
            <span className="safe-route-hint">
              🛡️ Route: Follow high-ground arterial roads; avoid low-lying canal bypasses.
            </span>
          </div>
        </div>

        {/* Card 2: Hospital */}
        <div className="evac-spot-card hospital-border">
          <div className="spot-card-top">
            <div className="spot-icon-wrap hospital-bg">
              <Hospital size={20} className="text-emerald-400" />
            </div>
            <span className="spot-distance-badge">
              <MapPin size={12} /> {hospitalDistanceKm} km away
            </span>
          </div>

          <span className="spot-role-tag">District Base Medical Facility</span>
          <h4 className="spot-name">{hospitalName}</h4>
          <p className="spot-description">
            24/7 Emergency & Trauma Intensive Care Unit. Standby backup diesel generators and clean water reverse osmosis filtration engaged during monsoon flood alerts.
          </p>

          <div className="spot-card-footer">
            <span className="safe-route-hint">
              🚑 Ambulance Transit: Accessible via Main Expressway & Flyover Corridors.
            </span>
          </div>
        </div>
      </div>

      {/* Emergency Go-Bag Preparation Checklist */}
      <div className="evac-checklist-card">
        <div className="checklist-top-row">
          <div>
            <h4 className="checklist-title">
              <ShieldAlert size={16} className="text-amber-400" />
              <span>Mandatory 72-Hour Flood "Go-Bag" Readiness</span>
            </h4>
            <p className="checklist-sub">
              Check off your essential survival items before rising floodwaters compromise access roads.
            </p>
          </div>

          <div className="checklist-progress-box">
            <span className="progress-label">{completedCount} of {checklist.length} Packed</span>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        </div>

        <div className="checklist-items-grid">
          {checklist.map((item) => (
            <div
              key={item.id}
              className={`checklist-item-row ${item.checked ? "item-checked" : ""}`}
              onClick={() => toggleCheck(item.id)}
            >
              <button
                type="button"
                className="checklist-check-btn"
                aria-label={item.label}
              >
                {item.checked ? (
                  <CheckSquare size={18} className="text-sky-400" />
                ) : (
                  <Square size={18} className="text-slate-500" />
                )}
              </button>
              <span className="checklist-text">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 1-Click National Disaster Speed-Dial Directory */}
      <div className="evac-hotlines-bar">
        <div className="hotline-item dmc">
          <div className="hotline-meta">
            <span className="hotline-provider">Disaster Management Centre</span>
            <span className="hotline-desc">24/7 Flood Inundation & Rescue Ops</span>
          </div>
          <a href="tel:117" className="hotline-call-pill red">
            <PhoneCall size={14} />
            <span>Call 117</span>
          </a>
        </div>

        <div className="hotline-item ambulance">
          <div className="hotline-meta">
            <span className="hotline-provider">Suwa Seriya Free Emergency</span>
            <span className="hotline-desc">Islandwide Medical Ambulance Service</span>
          </div>
          <a href="tel:1990" className="hotline-call-pill blue">
            <PhoneCall size={14} />
            <span>Call 1990</span>
          </a>
        </div>

        <div className="hotline-item navy">
          <div className="hotline-meta">
            <span className="hotline-provider">Sri Lanka Navy Flood Ops</span>
            <span className="hotline-desc">Dinghy Boat Evacuation & Deep Water Rescue</span>
          </div>
          <a href="tel:0112445368" className="hotline-call-pill teal">
            <PhoneCall size={14} />
            <span>011 244 5368</span>
          </a>
        </div>
      </div>
    </div>
  );
}
