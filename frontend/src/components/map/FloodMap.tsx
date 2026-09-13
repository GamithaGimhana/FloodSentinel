import { useState, ReactNode } from "react";
import { MapContainer, TileLayer, useMapEvents, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { District, SRI_LANKA_CENTER, DEFAULT_ZOOM } from "../../data/sriLankaDistricts";
import DistrictMarkers from "./DistrictMarkers";
import LocationFinder, { FoundLocation } from "./LocationFinder";
import { MapPin } from "lucide-react";

interface ClickCoord {
  lat: number;
  lon: number;
}

interface MapClickHandlerProps {
  onMapClick?: (coords: ClickCoord) => void;
}

function MapClickHandler({ onMapClick }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick({
          lat: Number(e.latlng.lat.toFixed(4)),
          lon: Number(e.latlng.lng.toFixed(4)),
        });
      }
    },
  });
  return null;
}

interface TileOption {
  name: string;
  url: string;
  attribution: string;
  subdomains?: string;
  maxZoom: number;
}

const BASE_TILES: Record<string, TileOption> = {
  dark: {
    name: "Dark Theme (Doppler Friendly)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16,
  },
  satellite: {
    name: "Satellite Terrain",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    maxZoom: 18,
  },
  osm: {
    name: "Standard Street Map",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
};

export interface FloodMapProps {
  selectedDistrict: District | null;
  onSelectDistrict?: (district: District) => void;
  customLocation: ClickCoord | FoundLocation | null;
  onCustomLocationSelect?: (coords: ClickCoord | FoundLocation) => void;
  children?: ReactNode;
}

/**
 * FloodMap Component (TypeScript)
 * Interactive Leaflet container centered on Sri Lanka with layer switcher,
 * district risk pins, GPS citizen locator, and radar cloud overlays.
 */
export default function FloodMap({
  selectedDistrict,
  onSelectDistrict,
  customLocation,
  onCustomLocationSelect,
  children,
}: FloodMapProps) {
  const [activeTileKey, setActiveTileKey] = useState<string>("dark");
  const currentTile = BASE_TILES[activeTileKey] || BASE_TILES.dark;

  return (
    <div className="flood-map-wrapper">
      {/* Floating Basemap Switcher */}
      <div className="map-layer-selector">
        <button
          className={`layer-btn ${activeTileKey === "dark" ? "active" : ""}`}
          onClick={() => setActiveTileKey("dark")}
        >
          Dark
        </button>
        <button
          className={`layer-btn ${activeTileKey === "satellite" ? "active" : ""}`}
          onClick={() => setActiveTileKey("satellite")}
        >
          Satellite
        </button>
        <button
          className={`layer-btn ${activeTileKey === "osm" ? "active" : ""}`}
          onClick={() => setActiveTileKey("osm")}
        >
          Street
        </button>
      </div>

      <MapContainer
        center={SRI_LANKA_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={6.5}
        maxZoom={16}
        className="leaflet-map-canvas"
        scrollWheelZoom={true}
      >
        {/* GPS Citizen Locator (rendered inside MapContainer to access useMap) */}
        <LocationFinder onLocationFound={onCustomLocationSelect} />

        {/* Active Tile Basemap */}
        <TileLayer
          key={activeTileKey}
          url={currentTile.url}
          attribution={currentTile.attribution}
          subdomains={currentTile.subdomains || "abc"}
          maxZoom={currentTile.maxZoom}
        />

        {/* Click anywhere on map */}
        <MapClickHandler onMapClick={onCustomLocationSelect} />

        {/* 25 District Pins */}
        <DistrictMarkers
          selectedDistrict={selectedDistrict}
          onSelectDistrict={onSelectDistrict}
        />

        {/* Pin marker for custom clicked or GPS located spot */}
        {customLocation && (
          <CircleMarker
            center={[customLocation.lat, customLocation.lon]}
            radius={9}
            pathOptions={{
              color: "#38bdf8",
              fillColor: "#0284c7",
              fillOpacity: 0.9,
              weight: 3,
            }}
          >
            <Popup>
              <div className="custom-pin-popup">
                <div className="custom-pin-header">
                  <MapPin size={14} color="#0284c7" />
                  <strong>Selected Coordinate</strong>
                </div>
                <p className="coord-text">
                  Lat: {customLocation.lat} | Lon: {customLocation.lon}
                </p>
                <p className="coord-sub">
                  Fetching live Open-Meteo precipitation & elevation...
                </p>
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* Radar Overlay & other map layer children */}
        {children}
      </MapContainer>
    </div>
  );
}
