from typing import Any


class RiskExplainer:
    def explain(self, assessment: Any) -> str:
        explanations = []
        contributors = getattr(assessment, "contributors", {}) or {}

        # Filter contributors that actually added meaningfully to the score
        significant = {k: v for k, v in contributors.items() if abs(v) > 0.5}

        if not significant:
            return "No significant risk contributors detected. System behavior matches learned baseline."

        for component, score in sorted(significant.items(), key=lambda item: item[1], reverse=True):
            sign = "+" if score > 0 else "-"
            explanations.append(f"{component.replace('_', ' ')} {sign}{abs(score):.1f}")

        return "Risk factors: " + ", ".join(explanations)
