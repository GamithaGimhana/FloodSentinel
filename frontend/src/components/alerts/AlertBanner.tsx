import { useState } from "react";
import { AlertTriangle, ShieldCheck, Siren, BellRing, PhoneCall, Volume2, VolumeX, ArrowRight } from "lucide-react";

export interface AlertBannerProps {
  probability: number;
  threatLevel?: "Safe" | "Advisory" | "Warning" | "Critical";
  districtName?: string;
  riverBasin?: string;
  onOpenEvacuation?: () => void;
  onOpenSmsModal?: () => void;
}

/**
 * AlertBanner Component (TypeScript)
 * Member B: Alert Dashboard & Safety Lead
 *
 * High-visibility emergency alert header dynamically rendering:
 * 🟢 SAFE (0–25%) | 🟡 ADVISORY (26–50%) | 🟠 WARNING (51–75%) | 🔴 CRITICAL EMERGENCY (76–100%)
 */
export default function AlertBanner({
  probability,
  threatLevel,
  districtName = "Colombo",
  riverBasin = "Kelani Ganga Catchment",
  onOpenEvacuation,
  onOpenSmsModal,
}: AlertBannerProps) {
  const [audioAlertActive, setAudioAlertActive] = useState<boolean>(false);

  // Compute tier if not passed
  const clamped = Math.min(100, Math.max(0, Math.round(probability)));
  const currentTier =
    threatLevel ||
    (clamped > 75 ? "Critical" : clamped > 50 ? "Warning" : clamped > 25 ? "Advisory" : "Safe");

  const tierDetails = {
    Critical: {
      colorClass: "banner-critical",
      icon: <Siren className="banner-siren-icon animate-bounce" size={24} />,
      title: "🔴 CRITICAL EMERGENCY (76–100%) — IMMEDIATE EVACUATION ORDER",
      headline: `Severe riverbank inundation imminent in ${districtName} (${riverBasin})!`,
      directive:
        "Water levels have crossed danger thresholds. Disconnect power mains, pack essential go-bags, and move immediately to designated evacuation shelters.",
      badge: "RED ALERT: CRITICAL HAZARD",
    },
    Warning: {
      colorClass: "banner-warning",
      icon: <AlertTriangle className="banner-icon animate-pulse" size={24} />,
      title: "🟠 FLOOD WARNING (51–75%) — RIVERS APPROACHING SPILL LEVEL",
      headline: `High hydrological stress detected across ${districtName} low-lying catchments.`,
      directive:
        "Residents in flood-prone buffer corridors should secure livestock, elevate valuables, and keep mobile communication devices fully charged.",
      badge: "AMBER ALERT: HIGH RISK",
    },
    Advisory: {
      colorClass: "banner-advisory",
      icon: <BellRing className="banner-icon" size={24} />,
      title: "🟡 FLOOD ADVISORY (26–50%) — MONSOON WATCH ACTIVE",
      headline: `Heavy catchment rainfall recorded in ${riverBasin}. Soil saturation elevated.`,
      directive:
        "Clear local stormwater drainage outlets, avoid non-essential travel along riverbanks, and monitor live Doppler radar precipitation maps.",
      badge: "YELLOW WATCH: ADVISORY",
    },
    Safe: {
      colorClass: "banner-safe",
      icon: <ShieldCheck className="banner-icon" size={24} />,
      title: "🟢 SAFE / NORMAL (0–25%) — WATER LEVELS STABLE",
      headline: `Normal seasonal hydrological flow recorded across ${districtName}.`,
      directive:
        "No active inundation threats detected. Standard meteorological monitoring remains engaged.",
      badge: "GREEN STATUS: STABLE",
    },
  }[currentTier];

  return (
    <aside className={`emergency-alert-banner ${tierDetails.colorClass}`} role="alert" aria-live="assertive">
      <div className="banner-content-container">
        {/* Left Icon & Beacon */}
        <div className="banner-lead-section">
          <div className="banner-icon-badge">{tierDetails.icon}</div>
          <div className="banner-text-block">
            <div className="banner-badge-row">
              <span className="tier-tag">{tierDetails.badge}</span>
              <span className="prob-pill">{clamped}% Flood Likelihood</span>
            </div>
            <h2 className="banner-main-title">{tierDetails.title}</h2>
            <p className="banner-headline">{tierDetails.headline}</p>
            <p className="banner-directive">{tierDetails.directive}</p>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="banner-action-group">
          <button
            type="button"
            className="banner-audio-toggle"
            onClick={() => setAudioAlertActive(!audioAlertActive)}
            title={audioAlertActive ? "Mute Emergency Siren" : "Test Audio Siren"}
            aria-label={audioAlertActive ? "Mute Emergency Siren" : "Test Audio Siren"}
          >
            {audioAlertActive ? <Volume2 size={16} className="text-red-400 animate-ping" /> : <VolumeX size={16} />}
            <span>{audioAlertActive ? "Siren Active" : "Test Siren"}</span>
          </button>

          {onOpenSmsModal && (
            <button type="button" onClick={onOpenSmsModal} className="banner-btn-secondary">
              <span>Preview Citizen SMS</span>
            </button>
          )}

          {onOpenEvacuation && (
            <button type="button" onClick={onOpenEvacuation} className="banner-btn-primary">
              <span>View Evacuation Guide</span>
              <ArrowRight size={14} />
            </button>
          )}

          <a href="tel:117" className="banner-emergency-call" title="Dial 117 DMC National Disaster Helpline">
            <PhoneCall size={14} />
            <span>Call 117</span>
          </a>
        </div>
      </div>
    </aside>
  );
}
