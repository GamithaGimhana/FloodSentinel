import type { Prediction } from '../../services/weatherService';
export function RiskBadge({ level }: { level?: string | null }) {
  return <span className={`risk-badge ${level?.toLowerCase() ?? 'unknown'}`}><i />{level ? level.charAt(0) + level.slice(1).toLowerCase() : 'Unavailable'}</span>;
}
export function RiskResult({ prediction, loading = false }: { prediction: Prediction | null; loading?: boolean }) {
  const score = prediction?.risk_score;
  return <div className="risk-result">
    <div className="section-label">{prediction?.model_type === 'pipeline' ? 'Model assessment' : 'Experimental risk index'}</div>
    <div className="risk-result-row"><span className="big-score">{loading ? '…' : score ?? '—'}<small>/100</small></span><RiskBadge level={prediction?.alert_level} /></div>
    <div className="risk-track"><span style={{ width: `${score ?? 0}%`, background: prediction ? `var(--${prediction.alert_level.toLowerCase()})` : undefined }} /></div>
    <div className="track-labels"><span>Lower</span><span>Higher</span></div>
    <p className="muted">{loading ? 'Calculating your assessment…' : prediction ? prediction.model_type === 'pipeline' ? 'Trained model output. Check the input assumptions before interpreting this result.' : 'Demonstration heuristic, not a calibrated probability or an official warning.' : 'An assessment needs available weather data and a working API.'}</p>
  </div>;
}
