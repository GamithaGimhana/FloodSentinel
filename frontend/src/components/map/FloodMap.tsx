import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { Layers } from 'lucide-react';
import { SRI_LANKA_DISTRICTS, type District } from '../../data/sriLankaDistricts';
import type { Telemetry } from '../../services/weatherService';
import RadarOverlay from './RadarOverlay';
import { riskLabel } from '../../services/assessment';
export interface Coordinates { lat: number; lon: number }
function MapController({ target, onPick }: { target: Coordinates; onPick: (p: Coordinates) => void }) {
  const map = useMap();
  useEffect(() => { map.flyTo([target.lat, target.lon], Math.max(map.getZoom(), 8), { duration: .7 }); }, [map, target.lat, target.lon]);
  useMapEvents({ click: e => onPick({ lat: Number(e.latlng.lat.toFixed(4)), lon: Number(e.latlng.lng.toFixed(4)) }) });
  return null;
}
const colors: Record<string, string> = { SAFE: '#168776', ADVISORY: '#c08a20', WARNING: '#dc7435', CRITICAL: '#d54d56' };
export default function FloodMap({ district, custom, readings, onDistrict, onPick }: {
  district: District; custom: Coordinates | null; readings: Telemetry[]; onDistrict: (d: District) => void; onPick: (p: Coordinates) => void;
}) {
  const [satellite, setSatellite] = useState(false);
  return <div className="map-shell"><MapContainer center={[7.65, 80.5]} zoom={7} minZoom={6} maxZoom={16} className="map-canvas" scrollWheelZoom maxBounds={[[5.6, 79], [10.3, 82.5]]}>
    <TileLayer url={satellite ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'} attribution={satellite ? 'Tiles © Esri' : '© OpenStreetMap contributors'} />
    <MapController target={custom ?? district} onPick={onPick} />
    {SRI_LANKA_DISTRICTS.map(d => { const reading = readings.find(t => t.id === d.id); const color = colors[reading?.risk_tier ?? ''] ?? '#80928e'; return <CircleMarker key={d.id} center={[d.lat, d.lon]} radius={!custom && district.id === d.id ? 10 : 6} bubblingMouseEvents={false} pathOptions={{ color: 'white', weight: 2, fillColor: color, fillOpacity: 1 }} eventHandlers={{ click: () => onDistrict(d) }}><Tooltip><strong>{d.name}</strong><br />{riskLabel(reading?.risk_tier)}{reading?.prediction && <><br />{reading.prediction.binary_prediction ? 'Above' : 'Below'} model threshold</>}</Tooltip></CircleMarker>; })}
    {custom && <CircleMarker center={[custom.lat, custom.lon]} radius={9} pathOptions={{ color: '#122f38', fillColor: '#fff', fillOpacity: 1, weight: 3 }}><Tooltip permanent>Your selected location</Tooltip></CircleMarker>}
    <RadarOverlay />
  </MapContainer><button className="map-basemap" onClick={() => setSatellite(!satellite)}><Layers size={15} />{satellite ? 'Street map' : 'Satellite'}</button><div className="map-legend"><span><i style={{ background: '#168776' }} />Lower score</span><span><i style={{ background: '#d54d56' }} />Higher score</span><span><i style={{ background: '#80928e' }} />Unavailable</span></div></div>;
}
