from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

try:
    from config import settings
except ImportError:
    class MockSettings:
        RISK_WEIGHT_ML = 0.2
        RISK_WEIGHT_BASELINE = 0.2
        RISK_WEIGHT_PROCESS = 0.15
        RISK_WEIGHT_NETWORK = 0.15
        RISK_WEIGHT_AUTH = 0.1
        RISK_WEIGHT_HEURISTIC = 0.1
        RISK_WEIGHT_THREAT_INTEL = 0.1
    settings = MockSettings()

from .correlator import EvidenceCorrelator
from .explainer import RiskExplainer

@dataclass
class RiskAssessment:
    score: float
    level: str
    classification: str
    contributors: Dict[str, float] = field(default_factory=dict)
    explanation: str = ""

class RiskEngine:
    def __init__(self):
        self.correlator = EvidenceCorrelator()
        self.explainer = RiskExplainer()

    def calculate_risk(self, 
                       ml_result: Dict[str, Any], 
                       baseline_deviation: Dict[str, Any], 
                       process_analysis: List[Dict[str, Any]], 
                       network_analysis: List[Dict[str, Any]], 
                       auth_analysis: Dict[str, Any], 
                       heuristic_results: List[Dict[str, Any]], 
                       threat_intel: List[Dict[str, Any]]) -> RiskAssessment:
        
        contributors = {}
        score = 0.0
        
        # 1. ML Anomaly (0-1)
        ml_score = ml_result.get('anomaly_score', 0)
        contrib_ml = ml_score * 100 * settings.RISK_WEIGHT_ML
        contributors['ML_Anomaly'] = contrib_ml
        score += contrib_ml
        
        # 2. Baseline Deviation (0-100 scale from deviation calculator)
        dev_score = baseline_deviation.get('overall_score', 0)
        contrib_dev = dev_score * settings.RISK_WEIGHT_BASELINE
        contributors['Baseline_Deviation'] = contrib_dev
        score += contrib_dev
        
        # 3. Process Analysis
        max_proc_risk = max([p.get('risk_score', 0) for p in process_analysis], default=0)
        contrib_proc = max_proc_risk * 100 * settings.RISK_WEIGHT_PROCESS
        contributors['Process_Analysis'] = contrib_proc
        score += contrib_proc
        
        # 4. Network Analysis
        max_net_risk = max([n.get('risk_score', 0) for n in network_analysis], default=0)
        contrib_net = max_net_risk * 100 * settings.RISK_WEIGHT_NETWORK
        contributors['Network_Analysis'] = contrib_net
        score += contrib_net
        
        # 5. Auth Analysis
        auth_risk = auth_analysis.get('risk_score', 0)
        contrib_auth = auth_risk * 100 * settings.RISK_WEIGHT_AUTH
        contributors['Auth_Analysis'] = contrib_auth
        score += contrib_auth
        
        # 6. Heuristics (Sum of risk contributions)
        heuristic_score = sum([h.get('risk_contribution', 0) for h in heuristic_results])
        contrib_heur = min(100, heuristic_score) * settings.RISK_WEIGHT_HEURISTIC
        contributors['Heuristics'] = contrib_heur
        score += contrib_heur
        
        # 7. Threat Intel
        ti_score = 0
        for ti in threat_intel:
            if ti.get('is_malicious'):
                ti_score = 100
                break
        contrib_ti = ti_score * settings.RISK_WEIGHT_THREAT_INTEL
        contributors['Threat_Intel'] = contrib_ti
        score += contrib_ti
        
        # Ambient baseline activity (represents normal operating entropy and active workloads)
        proc_count = len(process_analysis)
        net_count = len(network_analysis)
        ambient_baseline = 1.5
        if proc_count > 0:
            ambient_baseline += min(1.5, proc_count * 0.01)
        if net_count > 0:
            ambient_baseline += min(1.0, net_count * 0.01)
            
        contributors['Ambient_Baseline'] = round(ambient_baseline, 1)
        score += ambient_baseline

        # Correlation adjustments
        all_evidence = {
            'ml': ml_result,
            'baseline': baseline_deviation,
            'process': process_analysis,
            'network': network_analysis,
            'auth': auth_analysis,
            'heuristic': heuristic_results,
            'threat_intel': threat_intel
        }
        
        correlation_adj = self.correlator.correlate(all_evidence)
        if correlation_adj != 0:
            contributors['Correlation_Adjustment'] = correlation_adj
        score += correlation_adj
        
        # Final bounding
        final_score = min(100.0, max(0.0, round(score, 1)))
        
        level = "Normal"
        classification = "Normal Behavior"
        
        if final_score >= 80:
            level = "Critical"
            classification = "Critical Security Threat / High-Confidence Attack"
        elif final_score >= 60:
            level = "High"
            classification = "Suspicious Multi-Signal Anomaly"
        elif final_score >= 40:
            level = "Moderate"
            classification = "Moderate Behavioral Deviation"
        elif final_score >= 20:
            level = "Low"
            classification = "Low / Informational Deviations"
            
        assessment = RiskAssessment(
            score=final_score,
            level=level,
            classification=classification,
            contributors=contributors
        )
        
        assessment.explanation = self.explainer.explain(assessment)
        return assessment
