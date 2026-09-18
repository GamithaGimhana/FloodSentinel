import type { Prediction } from '../../services/weatherService';
import { riskLabel } from '../../services/assessment';
export function RiskBadge({ level }: { level?: string | null }) {
  return <span className={`risk-badge ${level?.toLowerCase() ?? 'unknown'}`}><i />{riskLabel(level)}</span>;
}
export function RiskResult({ prediction, loading = false }: { prediction: Prediction | null; loading?: boolean }) {
  const score = prediction?.risk_score;
  return <div className="risk-result">
    <div className="section-label">{'Model assessment'}</div>
    <div className="risk-result-row"><span className="big-score">{loading ? '…' : score ?? '—'}<small>/100</small></span><RiskBadge level={prediction?.alert_level} /></div>
    <div className="risk-track"><span style={{ width: `${score ?? 0}%`, background: prediction ? `var(--${prediction.alert_level.toLowerCase()})` : undefined }} /></div>
    <div className="track-labels"><span>Lower</span><span>Higher</span></div>
    <p className="muted">{loading ? 'Calculating your assessment…' : prediction ? prediction.data_scope : 'Assessment unavailable. A working model and valid inputs are required.'}</p>
    {prediction && <><div className="info-note"><strong>{prediction.binary_prediction ? 'Above' : 'Below'} model threshold</strong><br />Synthetic model score {(prediction.flood_probability * 100).toFixed(2)}% · Threshold {(prediction.threshold_used * 100).toFixed(2)}%</div><p className="fine-print">{prediction.tier_policy}</p>{prediction.input_warnings?.map(warning => <p className="info-note" key={warning}>{warning}</p>)}<p className="muted">{prediction.recommended_action}</p></>}
  </div>;
}
