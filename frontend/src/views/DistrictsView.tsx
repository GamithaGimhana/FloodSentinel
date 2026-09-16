import { useState } from 'react';
import { Search, ArrowUpRight, Download } from 'lucide-react';
import { SRI_LANKA_DISTRICTS, type District } from '../data/sriLankaDistricts';
import { timeLabel, type DistrictSnapshot } from '../services/weatherService';
import { RiskBadge } from '../components/common/Status';
export default function DistrictsView({ snapshot, onSelect }: { snapshot: DistrictSnapshot | null; onSelect: (district: District) => void }) {
  const [search, setSearch] = useState(''); const [level, setLevel] = useState('all');
  const rows = SRI_LANKA_DISTRICTS.map(d => ({ ...d, telemetry: snapshot?.districts.find(t => t.id === d.id) }));
  const filtered = rows.filter(d => `${d.name} ${d.province} ${d.riverBasin}`.toLowerCase().includes(search.toLowerCase()) && (level === 'all' || (d.telemetry?.risk_tier ?? 'unavailable') === level));
  const exportCsv = () => {
    const quote = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const csv = [['District', 'Province', 'Weather status', 'Experimental tier', 'Score /100', 'Engine', 'Rainfall 7d mm', 'Observed at', 'Assumptions'], ...filtered.map(d => [d.name, d.province, d.telemetry?.status ?? 'unavailable', d.telemetry?.risk_tier, d.telemetry?.risk_score, d.telemetry?.prediction?.model_type, d.telemetry?.rain_7d_mm, d.telemetry?.observed_at, d.telemetry?.assumptions.join(' ')])].map(row => row.map(quote).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = url; a.download = 'floodsentinel-districts.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="card directory"><div className="card-heading"><div><span className="eyebrow">ISLAND-WIDE COVERAGE</span><h2>25 districts. One view.</h2></div><button className="button secondary" onClick={exportCsv}><Download size={15} />Export CSV</button></div>
    <p className="muted">Experimental assessments use district terrain and disclosed scenario proxies. Missing readings remain unavailable.</p>
    <div className="filter-row"><label className="search-box"><Search size={17} /><input aria-label="Search districts" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search district, province or river…" /></label><select aria-label="Filter assessment" value={level} onChange={e => setLevel(e.target.value)}><option value="all">All assessments</option>{['SAFE', 'ADVISORY', 'WARNING', 'CRITICAL', 'unavailable'].map(v => <option key={v} value={v}>{v === 'SAFE' ? 'Safe (experimental)' : v.charAt(0) + v.slice(1).toLowerCase()}</option>)}</select><span className="muted">{filtered.length} districts</span></div>
    <div className="table-scroll"><table><thead><tr><th>District / province</th><th>River basin</th><th>7-day rain</th><th>Experimental tier</th><th>Observation</th><th><span className="sr-only">Open district</span></th></tr></thead><tbody>{filtered.map(d => <tr key={d.id}><td><strong>{d.name}</strong><small>{d.province}</small></td><td>{d.riverBasin}</td><td>{d.telemetry?.rain_7d_mm != null ? `${d.telemetry.rain_7d_mm} mm` : '—'}</td><td><RiskBadge level={d.telemetry?.risk_tier} /></td><td>{timeLabel(d.telemetry?.observed_at)}</td><td><button className="icon-button" aria-label={`Open ${d.name}`} onClick={() => onSelect(d)}><ArrowUpRight size={18} /></button></td></tr>)}</tbody></table></div>{!filtered.length && <div className="empty-state">No districts match these filters.</div>}
  </section>;
}
