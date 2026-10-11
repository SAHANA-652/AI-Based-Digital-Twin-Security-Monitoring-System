from typing import Dict, Any


class EvidenceCorrelator:
    def correlate(self, all_evidence: Dict[str, Any]) -> float:
        adjustment = 0.0
        
        has_high_proc = any(p.get('risk_score', 0) > 0.6 for p in all_evidence.get('process', []))
        has_high_net = any(n.get('risk_score', 0) > 0.6 for n in all_evidence.get('network', []))
        has_high_ml = all_evidence.get('ml', {}).get('anomaly_score', 0) > 0.75
        has_high_auth = all_evidence.get('auth', {}).get('risk_score', 0) > 0.6
        has_ti = any(t.get('is_malicious') for t in all_evidence.get('threat_intel', []))
        has_high_dev = all_evidence.get('baseline', {}).get('overall_score', 0) > 50.0
        
        signals = sum([has_high_proc, has_high_net, has_high_ml, has_high_auth, has_ti, has_high_dev])
        
        # Multi-signal correlation: amplify when multiple attack indicators converge
        if signals >= 4:
            adjustment += 25.0
        elif signals >= 2:
            adjustment += 10.0
        else:
            # Ambient baseline state: maintain 0 adjustment so live metrics stay below 10
            adjustment += 0.0
            
        # Check heuristics for correlated rules
        heuristics = all_evidence.get('heuristic', [])
        rule_ids = {h.get('rule_id') for h in heuristics}
        if 'PROC_SUSPICIOUS_PATH' in rule_ids and 'NET_UNUSUAL_PORT' in rule_ids:
            adjustment += 15.0
        if 'RESOURCE_EXHAUSTION' in rule_ids or ('DISK_WRITE_BURST' in rule_ids and 'PROC_HIGH_RESOURCE' in rule_ids):
            adjustment += 15.0
        if 'AUTH_REPEATED_FAILURE' in rule_ids and has_ti:
            adjustment += 20.0
            
        return adjustment
