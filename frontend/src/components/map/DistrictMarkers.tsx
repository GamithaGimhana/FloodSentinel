import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { District, SRI_LANKA_DISTRICTS } from "../../data/sriLankaDistricts";
import { ShieldAlert, Droplets, Mountain, Landmark } from "lucide-react";

interface DistrictMarkersProps {
  selectedDistrict: District | null;
  onSelectDistrict?: (district: District) => void;
}

/**
 * Creates custom pulsing Leaflet HTML divIcon based on flood risk tier.
 */
function createRiskMarkerIcon(riskLevel: District["baseRisk"], isSelected: boolean = false): L.DivIcon {
  let color = "#10b981"; // Safe / Green
  let pulseColor = "rgba(16, 185, 129, 0.4)";

  if (riskLevel === "Critical" || riskLevel === "Severe") {
    color = "#ef4444"; // Red
    pulseColor = "rgba(239, 68, 68, 0.5)";
  } else if (riskLevel === "Warning" || riskLevel === "High") {
    color = "#f97316"; // Orange
    pulseColor = "rgba(249, 115, 22, 0.5)";
  } else if (riskLevel === "Advisory" || riskLevel === "Moderate") {
    color = "#eab308"; // Yellow
    pulseColor = "rgba(234, 179, 8, 0.4)";
  }

  const selectedRing = isSelected ? `box-shadow: 0 0 0 4px #ffffff, 0 0 16px ${color};` : "";

  return L.divIcon({
    className: "custom-risk-marker",
    html: `
      <div style="
        position: relative;
        width: 24px;
        height: 24px;
        background: ${color};
        border-radius: 50%;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.6);
        ${selectedRing}
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: ${pulseColor};
          animation: pulseMarker 2s infinite ease-out;
        "></div>
        <div style="
          width: 8px;
          height: 8px;
          background: #ffffff;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
}

/**
 * DistrictMarkers Component (TypeScript)
 * Renders all 25 Sri Lankan district locations with dynamic flood risk styling
 */
export default function DistrictMarkers({
  selectedDistrict,
  onSelectDistrict,
}: DistrictMarkersProps) {
  return (
    <>
      {SRI_LANKA_DISTRICTS.map((district) => {
        const isSelected = selectedDistrict?.id === district.id;
        const icon = createRiskMarkerIcon(district.baseRisk, isSelected);

        return (
          <Marker
            key={district.id}
            position={[district.lat, district.lon]}
            icon={icon}
            eventHandlers={{
              click: () => {
                if (onSelectDistrict) {
                  onSelectDistrict(district);
                }
              },
            }}
          >
            <Popup className="district-popup">
              <div className="popup-card">
                <div className="popup-header">
                  <h4 className="popup-title">{district.name}</h4>
                  <span className={`popup-badge risk-${district.baseRisk.toLowerCase()}`}>
                    {district.baseRisk} Risk
                  </span>
                </div>

                <p className="popup-province">
                  Province: <strong>{district.province}</strong>
                </p>

                <div className="popup-meta-grid">
                  <div className="popup-meta-item">
                    <Mountain size={13} className="meta-icon" />
                    <span>Elevation: <strong>{district.elevation}m</strong></span>
                  </div>
                  <div className="popup-meta-item">
                    <Droplets size={13} className="meta-icon" />
                    <span>Basin: <strong>{district.riverBasin}</strong></span>
                  </div>
                  <div className="popup-meta-item">
                    <ShieldAlert size={13} className="meta-icon" />
                    <span>Historical Events: <strong>{district.historicalFloodCount}</strong></span>
                  </div>
                </div>

                <div className="popup-safety-box">
                  <div className="safety-row">
                    <Landmark size={12} />
                    <span>Shelter: {district.nearestEvacCenter}</span>
                  </div>
                </div>

                <button
                  className="popup-select-btn"
                  onClick={() => onSelectDistrict && onSelectDistrict(district)}
                >
                  Inspect Live Radar & Forecast →
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
