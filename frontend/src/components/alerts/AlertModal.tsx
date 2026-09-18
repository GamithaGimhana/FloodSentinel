import { useEffect } from "react";
import { X, Siren, PhoneCall, CheckCircle, Smartphone, Wifi, Battery } from "lucide-react";

export interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  districtName?: string;
  probability?: number;
  shelterName?: string;
  riverBasin?: string;
}

/**
 * AlertModal Component (TypeScript)
 * Member B: Alert Dashboard & Simulation Lead
 *
 * Simulated instant SMS / Push alert preview demonstrating how citizens
 * receive real-time mobile warnings during critical flood danger.
 */
export default function AlertModal({
  isOpen,
  onClose,
  districtName = "Ratnapura",
  probability = 88,
  shelterName = "Ratnapura Convent Assembly Camp",
  riverBasin = "Kalu Ganga Catchment",
}: AlertModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const now = new Date();
  const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="alert-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="alert-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Close Button */}
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close Alert Simulation"
        >
          <X size={18} />
        </button>

        {/* Modal Subheader */}
        <div className="modal-lead-header">
          <Smartphone className="text-sky-400" size={18} />
          <div>
            <h3 className="modal-title">Sri Lanka Emergency Cell Broadcast Simulation</h3>
            <p className="modal-subtitle">
              Simulating the real-time push alert dispatched to citizen mobile devices in {districtName}.
            </p>
          </div>
        </div>

        {/* Realistic Mobile Device Mockup Frame */}
        <div className="phone-mockup-frame">
          {/* Phone Status Bar */}
          <div className="phone-status-bar">
            <span className="phone-time">{timeString}</span>
            <div className="phone-icons-cluster">
              <Wifi size={12} />
              <span className="phone-network-tag">Dialog 4G</span>
              <Battery size={13} />
            </div>
          </div>

          {/* Emergency Alert Push Notification Card */}
          <div className="phone-broadcast-banner animate-pulse">
            <div className="broadcast-header">
              <div className="broadcast-title-row">
                <Siren size={18} className="text-red-500 animate-bounce" />
                <span className="broadcast-sender">DMC_ALERT • EMERGENCY BROADCAST</span>
              </div>
              <span className="broadcast-time">Just Now</span>
            </div>

            <h4 className="broadcast-subject">
              CRITICAL FLOOD INUNDATION ORDER: {districtName.toUpperCase()}
            </h4>

            <div className="broadcast-body-text">
              <p>
                <strong>DMC EMERGENCY BULLETIN:</strong> Extreme rainfall ({probability}% flood likelihood) has breached the spillway thresholds of <strong>{riverBasin}</strong>!
              </p>
              <p>
                Immediate evacuation required for all low-lying corridors. Proceed calmly to designated high-ground safe camp:
              </p>
              <div className="sms-shelter-pill">
                📍 <strong>{shelterName}</strong>
              </div>
              <p className="sms-hotline-note">
                For boat rescue or stranded families, contact <strong>DMC Hotline: 117</strong> immediately.
              </p>
            </div>

            <div className="phone-action-buttons">
              <button
                type="button"
                className="phone-btn acknowledge"
                onClick={onClose}
              >
                <CheckCircle size={15} />
                <span>Acknowledge Alert</span>
              </button>

              <a
                href="tel:117"
                className="phone-btn call-dmc"
                onClick={onClose}
              >
                <PhoneCall size={15} />
                <span>Speed Dial 117</span>
              </a>
            </div>
          </div>

          {/* Simulated Home Screen Indicators */}
          <div className="phone-bottom-home-bar"></div>
        </div>

        {/* Informational Footer */}
        <div className="modal-footer-note">
          <span>ℹ️ This protocol is powered by DMC Early Warning Cell Broadcast integration specs.</span>
        </div>
      </div>
    </div>
  );
}
