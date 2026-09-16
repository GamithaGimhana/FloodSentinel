import { useEffect, useState } from 'react';
import { FlaskConical, RotateCcw, Download, ArrowRight } from 'lucide-react';
import { SRI_LANKA_DISTRICTS } from '../data/sriLankaDistricts';
import { simulate, type Prediction, type Scenario } from '../services/weatherService';
import { RiskResult } from '../components/common/Status';
const initial: Scenario = { rainfall_7d_mm: 100, elevation_m: 30, distance_to_river_m: 1000, soil_saturation_pct: 50, district: 'colombo' };
const fields = [
  { key: 'rainfall_7d_mm', label: 'Seven-day rainfall', unit: 'mm', min: 0, max: 500, step: 5, hint: 'Accumulated rainfall over seven completed days' },
  { key: 'elevation_m', label: 'Terrain elevation', unit: 'm', min: 0, max: 2500, step: 5, hint: 'Height above mean sea level' },
  { key: 'distance_to_river_m', label: 'Distance to a river', unit: 'm', min: 50, max: 5000, step: 50, hint: 'A scenario input, not a measured distance' },
  { key: 'soil_saturation_pct', label: 'Soil saturation', unit: '%', min: 0, max: 100, step: 1, hint: 'Used as a proxy for drainage capacity' },
] as const;
export default function AlertEvacDashboardView() {
  const [params, setParams] = useState<Scenario>(initial);
  const [result, setResult] = useState<Prediction | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setResult(null); setError('');
    const timer = setTimeout(() => {
      simulate(params, controller.signal).then(setResult).catch((e: Error) => {
        if (!controller.signal.aborted) setError(e.message);
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [params]);
  const exportResult = () => {
    const blob = new Blob([JSON.stringify({ created_at: new Date().toISOString(), inputs: params, result }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'floodsentinel-scenario.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className="simulation-layout">
    <section className="card scenario-card"><div className="card-heading"><div><span className="eyebrow">EXPLORE THE VARIABLES</span><h2>What if conditions change?</h2></div><FlaskConical size={24} /></div>
      <p className="muted">Adjust a scenario and see the backend recompute six hydrological features.</p>
      <div className="preset-row"><button onClick={() => setParams({ ...initial, rainfall_7d_mm: 15, soil_saturation_pct: 20 })}>Dry conditions</button><button onClick={() => setParams({ ...initial, rainfall_7d_mm: 250, elevation_m: 10, soil_saturation_pct: 85 })}>Heavy monsoon</button><button onClick={() => setParams({ ...initial, elevation_m: 1200 })}>Highlands</button></div>
      <label className="field-label" htmlFor="scenario-district">District context</label><select id="scenario-district" value={params.district} onChange={e => { const district = SRI_LANKA_DISTRICTS.find(d => d.id === e.target.value)!; setParams({ ...params, district: district.id, elevation_m: district.elevation }); }}>{SRI_LANKA_DISTRICTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
      {fields.map(f => <div className="scenario-field" key={f.key}><div><label htmlFor={f.key}>{f.label}</label><output htmlFor={f.key}>{params[f.key]} <small>{f.unit}</small></output></div><input id={f.key} type="range" min={f.min} max={f.max} step={f.step} value={params[f.key]} onChange={e => setParams({ ...params, [f.key]: Number(e.target.value) })} /><p>{f.hint}</p></div>)}
      <button className="button secondary" onClick={() => setParams(initial)}><RotateCcw size={15} />Reset inputs</button>
    </section>
    <div className="stack"><section className="card"><span className="eyebrow">BACKEND INFERENCE</span><h2>Your scenario assessment</h2>{error && <p role="alert" className="error-box">{error}</p>}<RiskResult prediction={result} loading={loading} /><button className="button full" disabled={!result || loading} onClick={exportResult}><Download size={16} />Export scenario</button></section>
      <section className="card"><h3>From inputs to insight <ArrowRight size={16} /></h3><p className="muted">All screens use the same backend feature contract. The active engine is shown with every result.</p><dl className="feature-list">{Object.entries(result?.engineered_features ?? {}).map(([key, value]) => <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{value.toFixed(3)}</dd></div>)}</dl><p className="fine-print">{result?.assumptions?.join(' ') ?? 'No model metrics are inferred or invented. A trained artifact is required for model mode.'}</p></section>
    </div>
  </div>;
}
