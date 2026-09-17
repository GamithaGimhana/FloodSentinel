import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Bell, Shield, Activity, Waves, LayoutDashboard, MapPin, FlaskConical, Bookmark, ArrowUpRight, RefreshCw, Navigation, Droplets, Thermometer, Sprout, ArrowRight, ShieldCheck, Info, Check, X } from 'lucide-react';
import { SRI_LANKA_DISTRICTS, type District } from './data/sriLankaDistricts';
import { useResource } from './hooks/useResource';
import { type DistrictSnapshot, type Weather, type Health, timeLabel } from './services/weatherService';
import { useAlerts } from './hooks/useAlerts';
import { RiskResult } from './components/common/Status';
import type { Coordinates } from './components/map/FloodMap';
const FloodMap = lazy(() => import('./components/map/FloodMap'));
const DistrictsView = lazy(() => import('./views/DistrictsView'));
const Simulator = lazy(() => import('./views/AlertEvacDashboardView'));
const SavedPlaces = lazy(() => import('./views/RegistrationView'));
const PredictionView = lazy(() => import('./views/PredictionView'));
const EmergencyView = lazy(() => import('./views/EmergencyView'));
const AlertsView = lazy(() => import('./views/AlertsView'));
const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'districts', label: 'District explorer', icon: MapPin },
  { id: 'simulator', label: 'Scenario lab', icon: FlaskConical },
  { id: 'predict', label: 'Model assessment', icon: Activity },
  { id: 'alerts', label: 'Alert centre', icon: Bell },
  { id: 'emergency', label: 'Emergency resources', icon: Shield },
  { id: 'saved', label: 'Saved places', icon: Bookmark },
] as const;
type Tab = typeof tabs[number]['id'];
function readRoute() {
  const [view, query = ''] = location.hash.slice(1).split('?');
  return { tab: (tabs.some(t => t.id === view) ? view : 'overview') as Tab,
    district: SRI_LANKA_DISTRICTS.find(d => d.id === new URLSearchParams(query).get('district')) ?? SRI_LANKA_DISTRICTS[0] };
}
const checklistLabels = ['Important documents in a waterproof bag', 'Drinking water and non-perishable food', 'Medicines and a first-aid kit', 'Charged phone, torch and power bank'];
function Preparedness() {
  const [checked, setChecked] = useState<boolean[]>(() => { try { const value: unknown = JSON.parse(localStorage.getItem('floodsentinel_checklist') ?? 'null'); return Array.isArray(value) && value.length === 4 && value.every(v => typeof v === 'boolean') ? value : [false, false, false, false]; } catch { return [false, false, false, false]; } });
  return <div className="preparedness"><div><ShieldCheck size={21} /><h3>A little preparation goes a long way.</h3><p>Use this personal checklist. Follow official guidance for any emergency.</p></div><div>{checklistLabels.map((label, i) => <label key={label}><input type="checkbox" checked={checked[i]} onChange={() => { const next = checked.map((v, j) => j === i ? !v : v); setChecked(next); try { localStorage.setItem('floodsentinel_checklist', JSON.stringify(next)); } catch { /* Checklist still works for this session. */ } }} /><span className="check-visual">{checked[i] && <Check size={12} />}</span>{label}</label>)}</div></div>;
}
export default function App() {
  const [route, setRoute] = useState(readRoute); const [custom, setCustom] = useState<Coordinates | null>(null);
  const [refresh, setRefresh] = useState(0); const [locating, setLocating] = useState(false); const [locationError, setLocationError] = useState('');
  const locationRequest = useRef(0);
  useEffect(() => { const handle = () => { const next = readRoute(); setRoute(next); if (next.district.id !== route.district.id) setCustom(null); locationRequest.current++; setLocating(false); }; window.addEventListener('hashchange', handle); return () => window.removeEventListener('hashchange', handle); }, [route.district.id]);
  const navigate = (tab: Tab, district = route.district) => { location.hash = `${tab}?district=${district.id}`; };
  const snapshot = useResource<DistrictSnapshot>('/api/v1/weather/districts', refresh);
  const alertHistory = useAlerts(snapshot.data);
  const health = useResource<Health>('/health', refresh);
  const target = custom ?? route.district;
  const weather = useResource<Weather>(route.tab === 'overview' ? `/api/v1/weather/live?lat=${target.lat}&lon=${target.lon}` : null, refresh);
  const reading = custom ? null : snapshot.data?.districts.find(d => d.id === route.district.id);
  const current = weather.data?.status === 'live' ? weather.data.current : null;
  const daily = weather.data?.status === 'live' ? weather.data.daily : null;
  const available = snapshot.data?.districts.filter(d => d.status === 'live').length ?? 0;
  const selectedName = custom ? 'Selected location' : route.district.name;
  const pickLocation = (p: Coordinates) => { locationRequest.current++; setLocating(false); if (p.lat < 5.8 || p.lat > 10 || p.lon < 79.4 || p.lon > 82.1) { setLocationError('Choose a location within Sri Lanka.'); return; } setLocationError(''); setCustom(p); };
  const locate = () => {
    if (!navigator.geolocation) { setLocationError('This browser does not support location access.'); return; }
    const request = ++locationRequest.current; setLocating(true); setLocationError('');
    navigator.geolocation.getCurrentPosition(pos => { if (request !== locationRequest.current) return; pickLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }); }, () => { if (request !== locationRequest.current) return; setLocating(false); setLocationError('Location access was denied or timed out. Select a district or click the map.'); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  };
  const descriptions: Record<Tab, [string, string]> = { predict: ['Put your data to work.', 'Run the exported model with a complete set of location and environmental inputs.'], alerts: ['Follow changing conditions.', 'Review experimental threshold exceedances and the history of your saved districts.'], emergency: ['Know where to find help.', 'Find mapped resources near the location selected on the overview map.'], overview: ['A clearer view of flood risk.', 'Explore conditions across Sri Lanka. Understand the data behind every assessment.'], districts: ['See the bigger picture.', 'Compare weather and experimental assessments across all 25 districts.'], simulator: ['Turn questions into scenarios.', 'Explore how rainfall, terrain and drainage change an assessment.'], saved: ['The places that matter.', 'Keep your districts close, with preferences stored only on this browser.'] };
  return <div className="app-shell"><a className="skip-link" href="#main">Skip to content</a>
    <aside className="sidebar"><a className="brand" href="#overview"><span className="brand-mark"><Waves size={25} /></span><span>floodsentinel<small>SRI LANKA</small></span></a><div className="workspace-tag"><span className="status-dot" />Citizen dashboard<span className="version">01</span></div><div className="nav-label">WORKSPACE</div><nav aria-label="Main navigation">{tabs.map(t => <a key={t.id} href={`#${t.id}?district=${route.district.id}`} className={route.tab === t.id ? 'nav-item active' : 'nav-item'} aria-current={route.tab === t.id ? 'page' : undefined}><t.icon size={18} />{t.label}{route.tab === t.id && <span className="nav-active-dot" />}</a>)}</nav>
      <div className="sidebar-bottom"><div className="project-badge"><FlaskConical size={18} /><div>Built for understanding<small>Machine Learning · Group project</small></div></div><p>Experimental assessments.<br />Always follow official DMC advice.</p><a className="official-link" href="https://www.dmc.gov.lk/" target="_blank" rel="noreferrer">Official DMC information<ArrowUpRight size={15} /></a></div>
    </aside><div className="main-shell"><header className="topbar"><div><span className="breadcrumb">Workspace</span><span className="divider">/</span>{tabs.find(t => t.id === route.tab)?.label}</div><div className="topbar-right"><span className={`connection ${health.data ? 'connected' : ''}`}><i />{health.data ? health.data.model_available ? 'Model connected' : 'Model unavailable' : health.loading ? 'Connecting' : 'API offline'}</span><span className="avatar">FS</span></div></header>
      <main id="main"><div className="page-heading"><div><span className="eyebrow">FLOOD INTELLIGENCE / SRI LANKA</span><h1>{descriptions[route.tab][0]}</h1><p>{descriptions[route.tab][1]}</p></div><button className="button secondary" disabled={snapshot.loading || weather.loading} onClick={() => setRefresh(v => v + 1)}><RefreshCw size={15} className={snapshot.loading ? 'spin' : ''} />Refresh data</button></div>
      <div className="notice"><Info size={17} /><span><strong>Academic prototype.</strong> {health.data?.model_available ? 'Trained on synthetic data. Assessments are experimental, not validated forecasts or official warnings.' : 'Model status is unavailable. Predictions require a successfully loaded artifact.'}</span><span className="notice-tag">TRANSPARENT BY DESIGN</span></div>
      {(snapshot.error || health.error) && <div role="alert" className="error-box">{snapshot.error ?? health.error}</div>}
      <Suspense fallback={<div className="card empty-state">Loading workspace…</div>}>
      {route.tab === 'overview' && <>
        <div className="metrics-row"><div className="metric"><span><MapPin size={16} />District coverage</span><strong>{available}<small>/ 25</small></strong><p>{snapshot.loading ? 'Fetching observations…' : 'With available weather readings'}</p></div><div className="metric"><span><Droplets size={16} />Seven-day rainfall</span><strong>{daily?.precipitation_sum_7d ?? '—'}<small>mm</small></strong><p>{selectedName} · seven completed days</p></div><div className="metric"><span><Sprout size={16} />Soil saturation</span><strong>{weather.data?.soil?.saturation_pct ?? '—'}<small>%</small></strong><p>Estimated from topsoil moisture</p></div><div className="metric"><span><Thermometer size={16} />Temperature</span><strong>{current?.temperature_2m ?? '—'}<small>°C</small></strong><p>{current?.condition_text ?? 'Observation unavailable'}</p></div></div>
        <div className="overview-grid"><section className="card map-card"><div className="card-heading"><div><h2>Conditions on the ground</h2><p className="muted">Select a district or explore a point on the map.</p></div><span className="small-tag">25 DISTRICTS</span></div><FloodMap district={route.district} custom={custom} readings={snapshot.data?.districts ?? []} onDistrict={d => { setCustom(null); locationRequest.current++; setLocating(false); navigate('overview', d); }} onPick={pickLocation} /><div className="map-footer"><span>Experimental assessments. Blank radar tiles may mean no coverage.</span><button className="text-button" onClick={locate} disabled={locating}><Navigation size={14} />{locating ? 'Locating…' : 'Use my location'}</button></div></section>
          <section className="card assessment-card"><span className="eyebrow">LOCATION DETAIL</span><div className="location-title"><h2>{selectedName}</h2>{custom && <button className="icon-button" aria-label="Return to district" onClick={() => setCustom(null)}><X size={16} /></button>}</div><p className="coordinates">{target.lat.toFixed(4)}° N, {target.lon.toFixed(4)}° E</p><label htmlFor="active-district" className="sr-only">Selected district</label><select id="active-district" value={route.district.id} onChange={e => { const d = SRI_LANKA_DISTRICTS.find(x => x.id === e.target.value)!; setCustom(null); navigate('overview', d); }}>{SRI_LANKA_DISTRICTS.map(d => <option key={d.id} value={d.id}>{d.name} · {d.province}</option>)}</select>
          <RiskResult prediction={reading?.prediction ?? null} loading={!custom && snapshot.loading} />{custom ? <p className="info-note">Point weather is available here. A risk assessment needs terrain and river-distance inputs: explore those in the scenario lab.</p> : <p className="fine-print">{reading?.assumptions.join(' ') ?? 'Assessment unavailable until weather observations arrive.'}</p>}
          <div className="detail-list"><div><span>Source</span><strong>{current ? 'Open-Meteo' : 'Unavailable'}</strong></div><div><span>Observed</span><strong>{timeLabel(current?.time)}</strong></div><div><span>Wind</span><strong>{current?.wind_speed_10m != null ? `${current.wind_speed_10m} km/h` : '—'}</strong></div></div><button className="button full" onClick={() => navigate('simulator')}><FlaskConical size={16} />Explore a scenario<ArrowRight size={15} /></button></section>
        </div>
        {(locationError || weather.error || weather.data?.status === 'unavailable') && <p className="error-box" role="alert">{locationError || weather.error || weather.data?.message}</p>}
        <div className="lower-grid"><section className="card rain-card"><div className="card-heading"><div><span className="eyebrow">RAINFALL HISTORY</span><h2>The last seven complete days</h2></div><Droplets size={21} /></div>{daily ? <div className="rain-chart" role="img" aria-label={daily.dates.map((d, i) => `${d}: ${daily.rain_values[i]} millimeters`).join('; ')}>{daily.dates.map((day, i) => <div className="rain-column" key={day}><span>{daily.rain_values[i]}</span><div className="rain-bar-space"><div style={{ height: `${Math.max(2, daily.rain_values[i] / Math.max(1, ...daily.rain_values) * 100)}%` }} /></div><small>{new Date(day + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</small></div>)}</div> : <div className="empty-state">{weather.loading ? 'Loading rainfall history…' : 'Rainfall history is currently unavailable.'}</div>}<p className="fine-print">Daily precipitation totals from Open-Meteo. Today’s incomplete total and future forecasts are excluded.</p></section><section className="card resource-card"><div className="large-icon"><ShieldCheck size={25} /></div><span className="eyebrow">STAY INFORMED</span><h2>Context before action.</h2><p className="muted">An experimental score is one piece of information. Use official advisories and local authorities for emergency decisions.</p><a className="button secondary" href="https://www.dmc.gov.lk/" target="_blank" rel="noreferrer">Visit the DMC<ArrowUpRight size={16} /></a><a className="emergency-link" href="tel:117">Emergency assistance · 117</a></section></div><Preparedness />
      </>}
      {route.tab === 'districts' && <DistrictsView snapshot={snapshot.data} onSelect={(d: District) => navigate('overview', d)} />}
      {route.tab === 'simulator' && <Simulator />}
      {route.tab === 'predict' && <PredictionView />}
      {route.tab === 'emergency' && <EmergencyView target={target} name={selectedName} />}
      {route.tab === 'alerts' && <AlertsView snapshot={snapshot.data} events={alertHistory.events} clear={alertHistory.clear} onSelect={id => navigate('overview', SRI_LANKA_DISTRICTS.find(d => d.id === id)!)} />}
      {route.tab === 'saved' && <SavedPlaces snapshot={snapshot.data} onNavigateToMap={(id: string) => navigate('overview', SRI_LANKA_DISTRICTS.find(d => d.id === id)!)} />}
      </Suspense><footer className="page-footer"><span><Waves size={14} />FloodSentinel · Built for Sri Lanka</span><span>Weather: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> · Weather radar by <a href="https://www.rainviewer.com/" target="_blank" rel="noreferrer">RainViewer</a> · Refreshes every 5 minutes</span></footer>
    </main></div></div>;
}
