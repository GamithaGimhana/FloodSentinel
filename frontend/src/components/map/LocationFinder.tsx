import { useState } from "react";
import { useMap } from "react-leaflet";
import { Navigation, Loader2, AlertCircle } from "lucide-react";

export interface FoundLocation {
  lat: number;
  lon: number;
  accuracy: number;
  isGps: boolean;
  label: string;
}

interface LocationFinderProps {
  onLocationFound?: (location: FoundLocation) => void;
}

/**
 * LocationFinder Component (TypeScript)
 * "Locate Me" button using browser Geolocation API.
 * Automatically zooms the Leaflet viewport to the citizen's GPS coordinates.
 */
export default function LocationFinder({ onLocationFound }: LocationFinderProps) {
  const map = useMap();
  const [locating, setLocating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser");
      return;
    }

    setLocating(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const { latitude, longitude, accuracy } = position.coords;

        // Animate map flyTo to user's location
        map.flyTo([latitude, longitude], 12, {
          animate: true,
          duration: 1.5,
        });

        if (onLocationFound) {
          onLocationFound({
            lat: latitude,
            lon: longitude,
            accuracy,
            isGps: true,
            label: `My Location (±${Math.round(accuracy)}m)`,
          });
        }
      },
      (err) => {
        setLocating(false);
        console.warn("Geolocation access denied or timed out:", err);
        setErrorMsg("GPS access denied. Click any district on the map instead.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  return (
    <div className="location-finder-container">
      <button
        onClick={handleLocateMe}
        disabled={locating}
        className="locate-me-btn"
        title="Find your real-time GPS location & flood risk"
        id="btn-locate-me"
      >
        {locating ? (
          <>
            <Loader2 className="btn-icon animate-spin" size={16} />
            <span>Locating GPS...</span>
          </>
        ) : (
          <>
            <Navigation className="btn-icon" size={16} />
            <span>Locate Me</span>
          </>
        )}
      </button>

      {errorMsg && (
        <div className="location-error-badge">
          <AlertCircle size={14} />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
