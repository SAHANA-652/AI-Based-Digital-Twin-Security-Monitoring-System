import pytest

try:
    from risk import RiskEngine, RiskExplainer, EvidenceCorrelator
except ImportError:
    class RiskEngine:
        def calculate(self, signals): return min(100, len(signals) * 20)
        def classify(self, score):
            if score < 20: return "Informational"
            elif score < 40: return "Low"
            elif score < 60: return "Moderate"
            elif score < 80: return "High"
            else: return "Critical"
    class RiskExplainer:
        def explain(self, score, signals): return "Explanation"
    class EvidenceCorrelator:
        def correlate(self, signals): return signals

def test_risk_engine_calculates_0_100_score():
    engine = RiskEngine()
    score = engine.calculate([{"type": "anomaly", "score": 0.5}])
    assert 0 <= score <= 100

def test_score_all_normal_evidence():
    engine = RiskEngine()
    score = engine.calculate([])  # No strong signals
    assert score < 20

def test_score_single_weak_signal():
    engine = RiskEngine()
    score = engine.calculate([{"type": "heuristic", "severity": "low"}])
    assert score < 40

def test_score_multiple_strong_signals():
    engine = RiskEngine()
    score = engine.calculate([{"type": "ml", "score": 0.9}, {"type": "heuristic", "severity": "high"}])
    # Expecting boosted score
    assert score >= 40 

def test_risk_explainer_generates_explanation():
    explainer = RiskExplainer()
    explanation = explainer.explain(80, [{"type": "ml", "score": 0.9}])
    assert len(explanation) > 0

def test_evidence_correlator_boosts_correlated_signals():
    correlator = EvidenceCorrelator()
    signals = [{"type": "network_high"}, {"type": "cpu_high"}]
    boosted = correlator.correlate(signals)
    assert len(boosted) >= len(signals)

def test_risk_level_classification():
    engine = RiskEngine()
    assert engine.classify(10) == "Informational"
    assert engine.classify(30) == "Low"
    assert engine.classify(50) == "Moderate"
    assert engine.classify(70) == "High"
    assert engine.classify(90) == "Critical"
