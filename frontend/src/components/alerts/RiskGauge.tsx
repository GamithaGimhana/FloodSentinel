import { useMemo } from "react";

export type ThreatLevel = "Safe" | "Advisory" | "Warning" | "Critical";

export interface RiskGaugeProps {
  probability: number; // 0 to 100
  threatLevel?: ThreatLevel;
  size?: number; // default 220
  showNeedle?: boolean;
}

/**
 * RiskGauge Component (TypeScript)
 * Member B: Alert Dashboard & Risk Gauge Lead
 *
 * Animated circular SVG gauge (0–100%) displaying real-time flood inundation
 * probability and active hydrological threat level.
 */
export default function RiskGauge({
  probability,
  threatLevel,
  size = 220,
  showNeedle = true,
}: RiskGaugeProps) {
  // Clamp probability between 0 and 100
  const clampedProb = Math.min(100, Math.max(0, Math.round(probability)));

  // Determine threat level automatically if not explicitly provided
  const computedThreatLevel: ThreatLevel = useMemo(() => {
    if (threatLevel) return threatLevel;
    if (clampedProb > 75) return "Critical";
    if (clampedProb > 50) return "Warning";
    if (clampedProb > 25) return "Advisory";
    return "Safe";
  }, [threatLevel, clampedProb]);

  // Color mapping by threat tier
  const tierConfig = useMemo(() => {
    switch (computedThreatLevel) {
      case "Critical":
        return {
          color: "#ef4444",
          gradientId: "gaugeGradRed",
          gradientStart: "#f87171",
          gradientEnd: "#dc2626",
          glow: "rgba(239, 68, 68, 0.45)",
          label: "CRITICAL EMERGENCY",
          subtitle: "Severe Inundation Hazard",
          badgeClass: "badge-critical",
        };
      case "Warning":
        return {
          color: "#f97316",
          gradientId: "gaugeGradOrange",
          gradientStart: "#fb923c",
          gradientEnd: "#ea580c",
          glow: "rgba(249, 115, 22, 0.45)",
          label: "FLOOD WARNING",
          subtitle: "River Overflow Threat",
          badgeClass: "badge-warning",
        };
      case "Advisory":
        return {
          color: "#f59e0b",
          gradientId: "gaugeGradYellow",
          gradientStart: "#fde047",
          gradientEnd: "#d97706",
          glow: "rgba(245, 158, 11, 0.45)",
          label: "WATCH ADVISORY",
          subtitle: "Catchment Soil Saturated",
          badgeClass: "badge-advisory",
        };
      default:
        return {
          color: "#10b981",
          gradientId: "gaugeGradGreen",
          gradientStart: "#34d399",
          gradientEnd: "#059669",
          glow: "rgba(16, 185, 129, 0.45)",
          label: "SAFE / NORMAL",
          subtitle: "Hydrological Buffer Stable",
          badgeClass: "badge-safe",
        };
    }
  }, [computedThreatLevel]);

  // SVG Gauge Math (240-degree arc from 150deg to 390deg)
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const totalArcAngle = 240; // degrees
  const circumference = 2 * Math.PI * radius;
  const arcLength = (totalArcAngle / 360) * circumference;
  const strokeDashoffset = arcLength - (clampedProb / 100) * arcLength;

  // Needle angle: from -120deg (0%) to +120deg (100%)
  const needleAngle = -120 + (clampedProb / 100) * totalArcAngle;

  return (
    <div className="risk-gauge-wrapper" style={{ width: size }}>
      <div className="gauge-svg-container" style={{ width: size, height: size * 0.85 }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="risk-gauge-svg"
        >
          <defs>
            {/* Dynamic Gradients */}
            <linearGradient id={tierConfig.gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={tierConfig.gradientStart} />
              <stop offset="100%" stopColor={tierConfig.gradientEnd} />
            </linearGradient>

            <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="5"
                floodColor={tierConfig.glow}
              />
            </filter>
          </defs>

          {/* Background Track Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(150 ${center} ${center})`}
          />

          {/* Active Value Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#${tierConfig.gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter="url(#gaugeGlow)"
            transform={`rotate(150 ${center} ${center})`}
            className="gauge-progress-arc"
          />

          {/* Optional Indicator Needle */}
          {showNeedle && (
            <g transform={`rotate(${needleAngle} ${center} ${center})`}>
              <line
                x1={center}
                y1={center}
                x2={center}
                y2={center - radius + strokeWidth + 4}
                stroke={tierConfig.color}
                strokeWidth={3.5}
                strokeLinecap="round"
                className="gauge-needle"
              />
              <circle
                cx={center}
                cy={center}
                r={6}
                fill={tierConfig.color}
                stroke="#ffffff"
                strokeWidth={2}
              />
            </g>
          )}
        </svg>

        {/* Center Numerical Value */}
        <div className="gauge-center-content" style={{ top: center * 0.72 }}>
          <span className="gauge-prob-val" style={{ color: tierConfig.color }}>
            {clampedProb}
            <span className="gauge-pct-sign">%</span>
          </span>
          <span className="gauge-prob-caption">Flood Probability</span>
        </div>
      </div>

      {/* Threat Tier Status Badge */}
      <div className="gauge-footer-meta">
        <div className={`gauge-tier-pill ${tierConfig.badgeClass}`}>
          <span className="tier-pulsing-dot"></span>
          <span>{tierConfig.label}</span>
        </div>
        <span className="gauge-sub-info">{tierConfig.subtitle}</span>
      </div>
    </div>
  );
}
