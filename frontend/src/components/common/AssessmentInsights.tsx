import { Activity, ArrowRight, Database } from 'lucide-react';
import type { AssessmentHistory, Telemetry } from '../../services/weatherService';
import { changedInputs, dateLabel, probabilityChange, signed } from '../../services/assessment';
import { useResource } from '../../hooks/useResource';

export function AssessmentHeadline({ name, reading, loading, onExplore }: {
  name: string; reading?: Telemetry | null; loading: boolean; onExplore: () => void;
}) {
  const prediction = reading?.prediction;
  const age = reading?.observed_at ? Math.max(0, (Date.now() - Date.parse(reading.observed_at)) / 60000) : null;
  return <section className="assessment-headline" aria-label={`${name} assessment summary`}>
    <div><span className="eyebrow">YOUR DISTRICT / {name.toUpperCase()}</span>
      <h2>{loading ? 'Building your district assessment…' : !prediction ? 'Assessment currently unavailable' : prediction.binary_prediction ? 'Conditions exceed the experimental model threshold' : 'Conditions are below the experimental model threshold'}</h2>
      <p>{prediction ? `Synthetic model score ${(prediction.flood_probability * 100).toFixed(2)}% · decision threshold ${(prediction.threshold_used * 100).toFixed(2)}%.` : 'Weather and a loaded model are needed to assess this district.'} This uses balanced synthetic training data, not a verified flood forecast.</p>
      <div className="assessment-facts"><span><Activity size={14} />{reading?.observed_at ? `Weather ${dateLabel(reading.observed_at)}` : 'No weather timestamp'}</span><span><Database size={14} />Weather estimates + assumed local features</span>
      {age !== null && <span className={age > 120 ? 'stale-reading' : ''}>{age > 120 ? 'Older weather reading' : 'Recent weather reading'} · {Math.round(age)} min old</span>}</div>
    </div><button className="button" onClick={onExplore}>Compare a scenario<ArrowRight size={16} /></button>
  </section>;
}

export default function AssessmentInsights({ reading, refresh }: { reading: Telemetry; refresh: number }) {
  const history = useResource<AssessmentHistory>(`/api/v1/weather/districts/${reading.id}/history`, refresh);
  const entries = history.data?.entries ?? [];
  const latest = entries[entries.length - 1]; const previous = entries[entries.length - 2];
  const delta = latest && previous ? probabilityChange(latest.prediction, previous.prediction) : null;
  const changes = latest && previous ? changedInputs(latest.inputs, previous.inputs) : [];
  const firstTime = entries.length ? Date.parse(entries[0].observed_at) : 0;
  const lastTime = latest ? Date.parse(latest.observed_at) : firstTime;
  if (!reading.assessment_inputs) return <section className="card error-box" role="alert">This backend is running an older version. Restart it with the updated code to enable assessment history and input sources.</section>;
  return <div className="insights-grid">
    <section className="card"><div className="card-heading"><div><span className="eyebrow">ASSESSMENT HISTORY</span><h2>How conditions are changing</h2></div><Activity size={22} /></div>
      <p className="muted">Recorded on the server when district data is requested. History survives browser restarts; collection pauses when nobody requests assessments.</p>
      {reading.history_status === 'unavailable' && <p className="error-box" role="alert">The current assessment could not be saved. History below may be older.</p>}
      {history.error && <p className="error-box" role="alert">{history.error}</p>}
      {history.loading ? <p className="empty-state">Loading recorded assessments…</p> : !entries.length ? <p className="empty-state">No recorded assessments yet. History begins with the first successful district assessment.</p> : <>
        <div className="history-summary"><strong>{delta !== null ? `${signed(delta)} pp` : 'Collecting a baseline'}</strong><span>{previous ? delta !== null ? 'probability change between the last two saved readings' : 'Model version or threshold changed; scores are not compared.' : 'One reading saved. A new provider timestamp will add the next point.'}</span></div>
        {entries.length > 1 && <><svg viewBox="0 0 600 160" className="history-chart" role="img" aria-label="Recorded model probabilities over time. Exact readings are available in the table below.">
          {[0, 50, 100].map(n => <g key={n}><line x1="35" x2="585" y1={135 - n * 1.1} y2={135 - n * 1.1} stroke="#dce5e0" /><text x="0" y={139 - n * 1.1} fontSize="11" fill="#5e726a">{n}%</text></g>)}
          {entries.map((entry, i) => <circle key={i} cx={35 + (Date.parse(entry.observed_at) - firstTime) / Math.max(1, lastTime - firstTime) * 550} cy={135 - entry.prediction.flood_probability * 110} r="4" fill={entry.prediction.binary_prediction ? '#b46d28' : '#197a63'}><title>{dateLabel(entry.observed_at)}: {(entry.prediction.flood_probability * 100).toFixed(2)}%</title></circle>)}
        </svg><div className="history-axis"><span>{dateLabel(entries[0].observed_at)}</span><span>{dateLabel(latest!.observed_at)}</span></div></>}
        {previous && <div className="change-context"><h3>What changed in the inputs?</h3>{changes.length ? <ul>{changes.map(change => <li key={change.key}>{change.key.replaceAll('_', ' ')}: <strong>{String(change.before)} → {String(change.after)}</strong></li>)}</ul> : <p className="muted">The recorded input values did not change.</p>}<p className="fine-print">These are input differences, not causal explanations or feature importance. Compare a scenario to test the model’s response.</p></div>}
        <details className="source-details"><summary>View {entries.length} saved {entries.length === 1 ? 'reading' : 'readings'}</summary><div className="table-scroll"><table><thead><tr><th>Weather time</th><th>Probability</th><th>7-day rain</th><th>Soil saturation</th><th>Model</th></tr></thead><tbody>{[...entries].reverse().map((entry, i) => <tr key={i}><td>{dateLabel(entry.observed_at)}</td><td>{(entry.prediction.flood_probability * 100).toFixed(2)}%</td><td>{entry.rain_7d_mm} mm</td><td>{entry.soil_saturation_pct}%</td><td>{entry.prediction.model_version}</td></tr>)}</tbody></table></div></details>
      </>}
      <p className="fine-print">Up to 288 readings per district are retained; the latest 48 are shown. No earlier history is fabricated.</p>
    </section>
    <section className="card"><span className="eyebrow">BEHIND THE ASSESSMENT</span><h2>Know where the inputs come from</h2><p className="muted">Only rainfall comes directly from the weather provider into this model. Soil saturation is a proxy; most local features are still assumptions.</p>
      <div className="provenance-list"><div><strong>Weather estimate</strong><span>Completed 1-, 7- and 30-day precipitation totals</span></div><div><strong>Derived inputs</strong><span>Surface-moisture-based saturation proxy</span></div><div><strong>District references</strong><span>District identity and reference elevation</span></div><div><strong>Unverified site values</strong><span>River distance, land cover, flood history and other local features</span></div></div>
      <details className="source-details"><summary>Inspect all {Object.keys(reading.assessment_inputs).length} model inputs</summary><div className="table-scroll"><table><thead><tr><th>Input</th><th>Value</th><th>Source</th></tr></thead><tbody>{Object.entries(reading.assessment_inputs).map(([key, value]) => <tr key={key}><td>{key.replaceAll('_', ' ')}</td><td title={String(value)}>{typeof value === 'number' ? value.toLocaleString('en-GB', { maximumFractionDigits: 6 }) : value}</td><td>{reading.input_sources[key]}</td></tr>)}</tbody></table></div></details>
    </section>
  </div>;
}
