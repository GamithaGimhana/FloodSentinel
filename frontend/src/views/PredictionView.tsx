import { useState } from 'react';
import { Download, Play, Upload } from 'lucide-react';
import { api, type Prediction } from '../services/weatherService';
import { useResource } from '../hooks/useResource';
import { RiskResult } from '../components/common/Status';
import { SRI_LANKA_DISTRICTS } from '../data/sriLankaDistricts';

interface ModelInfo {
  version: string; architecture: string; decision_threshold: number; data_scope: string;
  sample_payloads: Record<string, Record<string, string | number>>;
  input_schema: { properties: Record<string, { type: string; enum?: string[]; minimum?: number; maximum?: number }> };
}
export default function PredictionView() {
  const model = useResource<ModelInfo>('/api/v1/model', 0);
  const [inputs, setInputs] = useState<Record<string, string | number>>({});
  const [result, setResult] = useState<Prediction | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const update = (key: string, value: string | number) => { setInputs(v => ({ ...v, [key]: value })); setResult(null); };
  const predict = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setResult(null); setError('');
    try { setResult(await api<Prediction>('/api/v1/predict', { method: 'POST', body: JSON.stringify(inputs) })); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const exportResult = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ inputs, result, generated_at: new Date().toISOString() }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'floodsentinel-prediction.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className="prediction-layout"><section className="card"><span className="eyebrow">COMPLETE FEATURE INPUT</span><h2>Assess a location</h2><p className="muted">Supply all 23 inputs, or load an exported synthetic sample to test the model. Sample coordinates are synthetic and may not match the named district.</p>
    {(error || model.error) && <p role="alert" className="error-box">{error || model.error}</p>}
    {model.loading && <p>Loading model contract…</p>}
    <div className="preset-row">{Object.entries(model.data?.sample_payloads ?? {}).map(([name, sample]) => <button disabled={busy} key={name} onClick={() => { setInputs(sample); setResult(null); }}>{name.replaceAll('_', ' ')}</button>)}<label className="button secondary"><Upload size={14} />Import JSON<input className="sr-only" type="file" accept=".json,application/json" disabled={busy} onChange={async e => { const file = e.target.files?.[0]; if (!file) return; try { if (file.size > 50000) throw new Error('Input file must be under 50 KB.'); const value: unknown = JSON.parse(await file.text()); if (!value || typeof value !== 'object' || Array.isArray(value) || Object.values(value).some(v => typeof v !== 'number' && typeof v !== 'string')) throw new Error('Expected an object of raw input fields.'); setInputs(value as Record<string, string | number>); setResult(null); setError(''); } catch (err) { setError((err as Error).message); } e.target.value = ''; }} /></label></div>
    <form onSubmit={predict}><fieldset disabled={busy} className="input-fields"><div className="input-grid">{Object.entries(model.data?.input_schema.properties ?? {}).map(([key, spec]) => <label key={key} className="field-label" htmlFor={`input-${key}`}>{key.replaceAll('_', ' ')}{key === 'district' ? <select id={`input-${key}`} required value={inputs[key] ?? ''} onChange={e => update(key, e.target.value)}><option value="">Choose district</option>{SRI_LANKA_DISTRICTS.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}</select> : spec.enum ? <select id={`input-${key}`} required value={inputs[key] ?? ''} onChange={e => update(key, e.target.value)}><option value="">Choose value</option>{spec.enum.map(value => <option key={value} value={value}>{value}</option>)}</select> : <input id={`input-${key}`} required maxLength={spec.type === 'string' ? 80 : undefined} type={spec.type === 'string' ? 'text' : 'number'} min={spec.minimum} max={spec.maximum} step={spec.type === 'integer' ? 1 : 'any'} value={inputs[key] ?? ''} onChange={e => update(key, spec.type === 'string' || e.target.value === '' ? e.target.value : Number(e.target.value))} />}</label>)}</div></fieldset><button className="button full" disabled={busy || !model.data} type="submit"><Play size={15} />{busy ? 'Running model…' : 'Run prediction'}</button></form>
    </section><div className="stack"><section className="card"><span className="eyebrow">TRAINED MODEL</span><h2>Model result</h2><RiskResult prediction={result} loading={busy} /><button className="button secondary full" disabled={!result || busy} onClick={exportResult}><Download size={15} />Export result</button></section><section className="card"><h3>Model details</h3><p>{model.data?.architecture}</p><p className="muted">Version {model.data?.version ?? '—'} · Binary threshold {model.data?.decision_threshold.toFixed(6) ?? '—'}</p><p className="info-note">{model.data?.data_scope}</p><p className="fine-print">Display bands are a separate UI policy. They do not change the model’s binary decision.</p></section></div></div>;
}
