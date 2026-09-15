"""Alert categorization service mapping raw flood probabilities to 4-tier DMC alert levels."""

import logging
from typing import Dict, Any

from app.core.thresholds import ALERT_TIERS, get_alert_tier_by_probability, CALIBRATED_THRESHOLD

logger = logging.getLogger(__name__)


class AlertCategorizer:
    """Maps raw ML prediction probability to a structured 4-tier alert response."""

    def __init__(self, threshold: float = CALIBRATED_THRESHOLD):
        self.threshold = threshold

    def categorize(self, probability: float) -> Dict[str, Any]:
        """
        Converts a raw flood probability (0.0 - 1.0) into a structured alert result.

        Returns:
            Dict with keys: alert_level, alert_emoji, alert_color, risk_score,
                            binary_prediction, recommended_action
        """
        clamped_prob = max(0.0, min(1.0, probability))
        tier = get_alert_tier_by_probability(clamped_prob)

        # Scale probability to 0-100 risk score
        risk_score = int(round(clamped_prob * 100))

        # Binary prediction using calibrated threshold
        binary_prediction = 1 if clamped_prob >= self.threshold else 0

        return {
            "alert_level": tier.level,
            "alert_emoji": tier.emoji,
            "alert_color": tier.color_hex,
            "risk_score": risk_score,
            "binary_prediction": binary_prediction,
            "recommended_action": tier.recommended_action,
        }

    def get_all_tiers_summary(self) -> list:
        """Returns metadata summary for all 4 alert tiers (useful for frontend rendering)."""
        return [
            {
                "level": t.level,
                "emoji": t.emoji,
                "color": t.color_hex,
                "probability_range": f"{t.min_prob:.2f} – {t.max_prob:.2f}",
                "risk_score_range": f"{t.risk_score_min} – {t.risk_score_max}",
                "action": t.recommended_action,
            }
            for t in ALERT_TIERS
        ]


alert_categorizer = AlertCategorizer()
