import { useState } from 'react';
import { MapPin, Phone, ArrowUpRight, Navigation } from 'lucide-react';
import { useResource } from '../hooks/useResource';
import type { Coordinates } from '../components/map/FloodMap';
interface Facilities {
  status: string; notice: string; checked_at: string;
  facilities: { id: string; name: string; kind: string; distance_km: number; osm_url: string; directions_url: string }[];
  contacts: { name: string; phone: string; url: string }[];
}
export default function EmergencyView({ target, name }: { target: Coordinates; name: string }) {
  const [radius, setRadius] = useState(15); const [refresh, setRefresh] = useState(0);
  const resource = useResource<Facilities>(`/api/v1/emergency/nearby?lat=${target.lat}&lon=${target.lon}&radius_km=${radius}`, refresh);
  return <div className="stack"><section className="card"><span className="eyebrow">EMERGENCY CONTACTS</span><h2>Contact help first</h2><div className="emergency-contacts"><a className="button" href="tel:117"><Phone size={17} />DMC · 117</a><a className="button secondary" href="tel:1990"><Phone size={17} />Ambulance · 1990</a><a href="https://117.dmc.gov.lk/" target="_blank" rel="noreferrer">DMC help portal ↗</a><a href="https://www.1990.lk/" target="_blank" rel="noreferrer">Suwa Seriya ↗</a></div><p className="info-note">Confirm active evacuation centres and safe travel instructions with local authorities. A mapped facility is not a confirmed flood shelter.</p></section>
    <section className="card"><div className="card-heading"><div><span className="eyebrow">NEAR {name.toUpperCase()}</span><h2>Mapped resources nearby</h2><p className="muted">{target.lat.toFixed(4)}° N · {target.lon.toFixed(4)}° E</p></div><button className="button secondary" disabled={resource.loading} onClick={() => setRefresh(v => v+1)}>Refresh</button></div><label className="field-label" htmlFor="facility-radius">Search radius<select id="facility-radius" value={radius} onChange={e => setRadius(Number(e.target.value))}><option value={5}>5 km</option><option value={15}>15 km</option><option value={30}>30 km</option></select></label>
    {resource.error && <p className="error-box" role="alert">{resource.error}</p>}{resource.loading && <p role="status">Looking up community-mapped hospitals, assembly points and shelters…</p>}
    <p className="muted">{resource.data?.notice}</p><div className="facility-grid">{resource.data?.facilities.map(f => <article key={f.id} className="facility-card"><span className="eyebrow">{f.kind}</span><h3>{f.name}</h3><p><MapPin size={14} />{f.distance_km.toFixed(2)} km straight-line</p><p className="fine-print">Activation and availability unverified</p><div className="row-actions"><a className="button secondary" href={f.directions_url} target="_blank" rel="noreferrer"><Navigation size={14} />Open directions</a><a href={f.osm_url} target="_blank" rel="noreferrer" aria-label={`Map source for ${f.name}`}><ArrowUpRight size={18} /></a></div></article>)}</div>
    {!resource.loading && resource.data?.status === 'live' && !resource.data.facilities.length && <div className="empty-state">No mapped facilities found within this radius. Try a wider radius or contact DMC.</div>}
    <p className="fine-print">Directions open an external map; road flood conditions are not checked. Data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>.</p></section></div>;
}
