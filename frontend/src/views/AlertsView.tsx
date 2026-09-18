import { useState } from 'react';
import { Bell, ArrowUpRight, Trash2 } from 'lucide-react';
import type { DistrictSnapshot } from '../services/weatherService';
import type { AlertEvent } from '../hooks/useAlerts';
import { SRI_LANKA_DISTRICTS } from '../data/sriLankaDistricts';
import { readSavedPlaces } from '../services/watchlist';
import { RiskBadge } from '../components/common/Status';

export default function AlertsView({ snapshot, events, clear, onSelect }: { snapshot: DistrictSnapshot | null; events: AlertEvent[]; clear: () => void; onSelect: (id: string) => void }) {
  const [savedOnly, setSavedOnly] = useState(false);
  const saved = readSavedPlaces();
  const assessments = (snapshot?.districts ?? []).filter(d => d.prediction?.binary_prediction === 1 && (!savedOnly || saved.includes(d.id))).sort((a, b) => b.prediction!.flood_probability - a.prediction!.flood_probability);
  return <div className="stack"><section className="card"><div className="card-heading"><div><span className="eyebrow">MODEL THRESHOLD EXCEEDED</span><h2><Bell size={21} /> Experimental alerts</h2></div><label><input type="checkbox" checked={savedOnly} onChange={e => setSavedOnly(e.target.checked)} /> Saved districts only</label></div><p className="muted">These assessments crossed the model’s binary threshold. The coloured bands are a separate display policy. No evacuation instruction is inferred from a score.</p>
    {!snapshot && <div className="empty-state">Waiting for district assessments…</div>}{snapshot && !assessments.length && <div className="empty-state">No threshold exceedances among the available {savedOnly ? 'saved ' : ''}district assessments. Missing data does not establish safe conditions.</div>}
    {assessments.map(d => <div className="saved-row" key={d.id}><div><h3>{SRI_LANKA_DISTRICTS.find(x => x.id === d.id)?.name}</h3><RiskBadge level={d.risk_tier} /><p className="muted">Probability {(d.prediction!.flood_probability * 100).toFixed(1)}% · Threshold {(d.prediction!.threshold_used * 100).toFixed(2)}%</p></div><button className="button secondary" onClick={() => onSelect(d.id)}>View district<ArrowUpRight size={15} /></button></div>)}</section>
    <section className="card"><div className="card-heading"><div><span className="eyebrow">SAVED DISTRICTS</span><h2>Assessment history</h2></div><button className="text-button" onClick={clear}><Trash2 size={14} />Clear history</button></div><p className="muted">Records a change in band or binary decision for saved districts while this dashboard is open. Stored only in this browser, up to 100 events. No SMS or background delivery is configured.</p>{!events.length && <div className="empty-state">Save a district to record its assessments on subsequent refreshes.</div>}{events.map(e => <div className="saved-row" key={e.id}><div><h3>{SRI_LANKA_DISTRICTS.find(d => d.id === e.district)?.name ?? e.district}</h3><p>{e.positive ? 'Above model threshold' : 'Below model threshold'} · {(e.probability * 100).toFixed(1)}%</p><p className="fine-print">{new Date(e.at).toLocaleString('en-GB', { timeZone: 'Asia/Colombo' })} SLST</p></div><RiskBadge level={e.level} /></div>)}</section></div>;
}
