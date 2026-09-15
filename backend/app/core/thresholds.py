"""4-tier alert boundary definitions and demonstration decision thresholds."""

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


# Default demonstration threshold; replace with a validated model threshold.
# This value will be updated once the full Optuna tuning pipeline (Step 10) is complete.
# No measured recall claim is made for this default.
CALIBRATED_THRESHOLD: float = 0.35

# Four project-specific display tiers; these are not official DMC warning levels.
ALERT_TIERS = [
    AlertTier(
        level="SAFE",
        emoji="🟢",
        color_hex="#22c55e",
        min_prob=0.00,
        max_prob=0.25,
        risk_score_min=0,
        risk_score_max=25,
        recommended_action=(
            "Normal seasonal conditions. This experimental score cannot establish whether a location is safe. "
            "Continue monitoring DMC river gauge updates during monsoon season."
        ),
    ),
    AlertTier(
        level="ADVISORY",
        emoji="🟡",
        color_hex="#eab308",
        min_prob=0.25,
        max_prob=0.50,
        risk_score_min=26,
        risk_score_max=50,
        recommended_action=(
            "Moderate flood risk detected. Monitor DMC river gauges and local rainfall. "
            "Secure important documents in waterproof containers. Stay alert for further advisories."
        ),
    ),
    AlertTier(
        level="WARNING",
        emoji="🟠",
        color_hex="#f97316",
        min_prob=0.50,
        max_prob=0.75,
        risk_score_min=51,
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
        min_prob=0.75,
        max_prob=1.00,
        risk_score_min=76,
        risk_score_max=100,
        recommended_action=(
            "Very high experimental risk score. Verify current official DMC guidance. "
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
        if clamped > tier.min_prob:
            return tier
    return ALERT_TIERS[0]
