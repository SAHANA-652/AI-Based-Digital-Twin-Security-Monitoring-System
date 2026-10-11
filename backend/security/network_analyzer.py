from typing import List, Dict, Any


class NetworkAnalyzer:
    def __init__(self):
        self.known_ips = set()
        self.known_ports = set()

    def analyze(self, connections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        results = []
        for c in connections:
            remote_ip = c.get('remote_address') or c.get('remote_ip')
            remote_port = c.get('remote_port')
            
            is_new_ip = False
            if remote_ip and remote_ip not in ('*', '0.0.0.0', '127.0.0.1', 'localhost', '::1', ''):
                if remote_ip not in self.known_ips:
                    is_new_ip = True
                    self.known_ips.add(remote_ip)
                
            if remote_port:
                self.known_ports.add(remote_port)
                
            risk_info = self.get_connection_risk(c)
            
            enriched = {
                **c,
                'is_new_ip': is_new_ip,
                'is_suspicious': risk_info['score'] > 0.25,
                'anomaly_score': risk_info['score'],
                'risk_score': risk_info['score'],
                'threat_intel_status': 'Clean' if not risk_info['score'] > 0.25 else 'Suspicious Endpoint',
                'risk_explanation': risk_info['explanation']
            }
            results.append(enriched)
            
        return results

    def get_connection_risk(self, connection: Dict[str, Any]) -> Dict[str, Any]:
        score = 0.0
        explanations = []
        
        port = connection.get('remote_port')
        common_ports = {80, 443, 53, 22, 3389, 8080, 8000, 5173, 123, 853, 5353}
        
        if port and port > 0 and port not in common_ports:
            # Check suspicious known bad ranges (Stratum mining, IRC, Telnet)
            if port in (3333, 4444, 5555, 6666, 6667, 1337, 23):
                score += 0.45
                explanations.append(f"Uncommon / high-risk destination port ({port})")
            else:
                score += 0.1
                explanations.append(f"Non-standard remote port ({port})")
            
        status = str(connection.get('status', '')).upper()
        if status == 'SYN_SENT':
            score += 0.15
            explanations.append("SYN_SENT connection state")
            
        return {
            'score': min(1.0, score),
            'explanation': ", ".join(explanations) if explanations else "Verified socket connection"
        }
