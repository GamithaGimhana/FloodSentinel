"""4-tier alert boundary definitions and calibrated decision thresholds."""

from typing import NamedTuple


class AlertTier(NamedTuple):
    """Represents a single alert tier with boundaries and metadata."""
    level: str
    emoji: str
    color_hex: str
    min_prob: float
    max_prob: float
    risk_score_min: int
    risk_score_max: int
    recommended_action: str


# Calibrated decision threshold from cost-sensitive optimization
# This value will be updated once the full Optuna tuning pipeline (Step 10) is complete.
# For now, using a conservative threshold optimized for high recall (>90%).
CALIBRATED_THRESHOLD: float = 0.35

# 4-tier alert level boundaries aligned with the DMC Sri Lanka protocol
ALERT_TIERS = [
    AlertTier(
        level="SAFE",
        emoji="🟢",
        color_hex="#22c55e",
        min_prob=0.00,
        max_prob=0.25,
        risk_score_min=0,
        risk_score_max=30,
        recommended_action=(
            "Normal seasonal conditions. No immediate flood threat detected. "
            "Continue monitoring DMC river gauge updates during monsoon season."
        ),
    ),
    AlertTier(
        level="ADVISORY",
        emoji="🟡",
        color_hex="#eab308",
        min_prob=0.26,
        max_prob=0.50,
        risk_score_min=31,
        risk_score_max=55,
        recommended_action=(
            "Moderate flood risk detected. Monitor DMC river gauges and local rainfall. "
            "Secure important documents in waterproof containers. Stay alert for further advisories."
        ),
    ),
    AlertTier(
        level="WARNING",
        emoji="🟠",
        color_hex="#f97316",
        min_prob=0.51,
        max_prob=0.75,
        risk_score_min=56,
        risk_score_max=75,
        recommended_action=(
            "High flood danger. Prepare emergency evacuation kit (Go-Bag). "
            "Secure supplies and move valuables to upper floors. "
            "Be ready to evacuate on short notice. DMC Hotline: 117."
        ),
    ),
    AlertTier(
        level="CRITICAL",
        emoji="🔴",
        color_hex="#ef4444",
        min_prob=0.76,
        max_prob=1.00,
        risk_score_min=76,
        risk_score_max=100,
        recommended_action=(
            "IMMINENT FLOOD THREAT — EVACUATE IMMEDIATELY. "
            "Move to designated evacuation shelters or higher ground. "
            "Do NOT attempt to cross flooded roads or waterways. "
            "Emergency contacts: DMC 117 | Ambulance 1990 | Navy Flood Ops 011-2421111."
        ),
    ),
]


def get_alert_tier_by_probability(probability: float) -> AlertTier:
    """Returns the appropriate AlertTier based on raw flood probability."""
    clamped = max(0.0, min(1.0, probability))
    for tier in reversed(ALERT_TIERS):
        if clamped >= tier.min_prob:
            return tier
    return ALERT_TIERS[0]
