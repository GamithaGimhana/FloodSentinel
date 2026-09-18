import { useEffect, useState } from 'react';
import { FlaskConical, RotateCcw, Download, ArrowRight } from 'lucide-react';
import { SRI_LANKA_DISTRICTS, type District } from '../data/sriLankaDistricts';
import { simulate, type Prediction, type Scenario, type Telemetry } from '../services/weatherService';
import { scenarioFromDistrict, changeRainfall, probabilityChange, signed, dateLabel } from '../services/assessment';
import { RiskResult } from '../components/common/Status';
const fields = [
  { key: 'rainfall_7d_mm', label: 'Seven-day rainfall', unit: 'mm', min: 0, max: 500, step: 5, hint: 'Accumulated rainfall over seven completed days' },
  { key: 'elevation_m', label: 'Terrain elevation', unit: 'm', min: 0, max: 2500, step: 5, hint: 'Height above mean sea level' },
  { key: 'distance_to_river_m', label: 'Distance to a river', unit: 'm', min: 50, max: 5000, step: 50, hint: 'A scenario input, not a measured distance' },
  { key: 'soil_saturation_pct', label: 'Soil saturation', unit: '%', min: 0, max: 100, step: 1, hint: 'Soil wetness, independent of drainage effectiveness' },
  { key: 'height_above_nearest_drainage_m', label: 'Height above drainage', unit: 'm', min: 0, max: 50, step: 1, hint: 'Local relative height, not altitude above sea level' },
  { key: 'drainage_index', label: 'Drainage effectiveness', unit: '', min: 0, max: 1, step: .01, hint: 'Higher values indicate better drainage; site evidence is required' },
] as const;
export default function AlertEvacDashboardView({ district, reading, onDistrict }: {
  district: District; reading?: Telemetry; onDistrict: (district: District) => void;
}) {
  const [baseline] = useState(() => ({ inputs: scenarioFromDistrict(district, reading), prediction: reading?.prediction, at: reading?.observed_at }));
  const [params, setParams] = useState<Scenario>(baseline.inputs);
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
    const blob = new Blob([JSON.stringify({ created_at: new Date().toISOString(), baseline, inputs: params, result }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'floodsentinel-scenario.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className="simulation-layout">
    <section className="card scenario-card"><div className="card-heading"><div><span className="eyebrow">EXPLORE THE VARIABLES</span><h2>What if conditions change?</h2></div><FlaskConical size={24} /></div>
      <p className="muted">Start with {district.name}’s assessment and change the inputs to test the model’s response. Rainfall changes scale the 24-hour and 30-day scenario totals proportionally. Soil saturation and drainage effectiveness are separate inputs.</p>
      <p className="info-note">{baseline.at ? `Starting weather: ${dateLabel(baseline.at)}. This baseline stays fixed while you explore.` : 'Live weather is unavailable. Starting values are a demonstration scenario.'}</p>
      <div className="preset-row"><button onClick={() => setParams(changeRainfall(baseline.inputs, Math.min(5000, baseline.inputs.rainfall_7d_mm * 1.25)))}>25% more rainfall</button><button onClick={() => setParams(changeRainfall(baseline.inputs, baseline.inputs.rainfall_7d_mm * .75))}>25% less rainfall</button><button onClick={() => setParams({ ...baseline.inputs, soil_saturation_pct: 85 })}>Saturated soil</button></div>
      <label className="field-label" htmlFor="scenario-district">District context</label><select id="scenario-district" value={params.district} onChange={e => onDistrict(SRI_LANKA_DISTRICTS.find(d => d.id === e.target.value)!)}>{SRI_LANKA_DISTRICTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
      {fields.map(f => <div className="scenario-field" key={f.key}><div><label htmlFor={f.key}>{f.label}</label><output htmlFor={f.key}>{Number(params[f.key].toFixed(2))} <small>{f.unit}</small></output></div><input id={f.key} type="range" min={Math.min(f.min, baseline.inputs[f.key])} max={Math.max(f.max, baseline.inputs[f.key], params[f.key])} step="any" value={params[f.key]} onChange={e => setParams(f.key === 'rainfall_7d_mm' ? changeRainfall(params, Number(e.target.value)) : { ...params, [f.key]: Number(e.target.value) })} /><p>{f.hint} · Starting value: {baseline.inputs[f.key]} {f.unit}</p></div>)}
      <button className="button secondary" onClick={() => setParams(baseline.inputs)}><RotateCcw size={15} />Reset to district baseline</button>
    </section>
    <div className="stack"><section className="card"><span className="eyebrow">BACKEND INFERENCE</span><h2>Your scenario assessment</h2>{error && <p role="alert" className="error-box">{error}</p>}
      {baseline.prediction && <div className="scenario-comparison"><div><span>District baseline</span><strong>{(baseline.prediction.flood_probability * 100).toFixed(2)}%</strong></div><ArrowRight size={18} /><div><span>Your scenario</span><strong>{result ? `${(result.flood_probability * 100).toFixed(2)}%` : '…'}</strong></div></div>}
      {result && baseline.prediction && <p className="info-note">{probabilityChange(result, baseline.prediction) !== null ? `${signed(probabilityChange(result, baseline.prediction)!)} percentage points from the district baseline. This is a sensitivity comparison, not a forecast or a causal explanation.` : 'The model version or threshold changed. Reload the district before comparing results.'}</p>}
      <RiskResult prediction={result} loading={loading} /><button className="button full" disabled={!result || loading} onClick={exportResult}><Download size={16} />Export comparison</button></section>
      <section className="card"><h3>From inputs to insight <ArrowRight size={16} /></h3><p className="muted">All screens use the same backend feature contract. The active engine is shown with every result.</p><dl className="feature-list">{Object.entries(result?.engineered_features ?? {}).map(([key, value]) => <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{value.toFixed(3)}</dd></div>)}</dl><p className="fine-print">{result?.assumptions?.join(' ') ?? 'No model metrics are inferred or invented. A trained artifact is required for model mode.'}</p></section>
    </div>
  </div>;
}
