from typing import List, Dict, Any
from datetime import datetime


class AuthAnalyzer:
    def __init__(self):
        # Rolling window of events seen across cycles — bounded to prevent unbounded growth
        self._window: List[Dict[str, Any]] = []
        self._window_limit = 200

    def analyze(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze the supplied event list.
        For normal (live) monitoring cycles, events is the collector snapshot (often empty).
        For simulation cycles, events are the injected fake auth events.
        We maintain a bounded rolling window so brute-force accumulates across cycles
        but we don't grow unbounded.
        """
        if events:
            self._window.extend(events)
            # Keep only the most recent window_limit entries
            if len(self._window) > self._window_limit:
                self._window = self._window[-self._window_limit:]

        risk_info = self._get_risk(self._window)
        return {
            'events_analyzed': len(events),
            'risk_score': risk_info['score'],
            'risk_explanation': risk_info['explanation']
        }

    def reset(self):
        """Clear accumulated events — called when simulation stops to purge sim auth events."""
        self._window.clear()

    def _get_risk(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        score = 0.0
        explanations = []

        # Count failed / suspicious in last 20 events
        recent = events[-20:] if len(events) > 20 else events
        failed_count = sum(
            1 for e in recent
            if e.get('status') == 'failed' or e.get('success') is False or e.get('is_suspicious') is True
        )

        if failed_count >= 6:
            score += 0.95
            explanations.append("Critical brute-force credential surge detected (multiple failed logons)")
        elif failed_count >= 3:
            score += 0.65
            explanations.append("Multiple failed logon attempts in short window")
        elif failed_count >= 1:
            score += 0.25
            explanations.append("Unsuccessful authentication event detected")

        # Time-of-day check on latest events
        for e in events[-5:]:
            hour = e.get('hour', datetime.now().hour)
            if hour < 5 or hour > 23:
                score += 0.2
                explanations.append("Login at non-standard hours")
                break

        return {
            'score': min(1.0, score),
            'explanation': ", ".join(explanations) if explanations else "Normal authentication patterns"
        }
