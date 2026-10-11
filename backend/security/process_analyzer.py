from typing import List, Dict, Any, Optional


class ProcessAnalyzer:
    def __init__(self):
        self.known_processes = set()

    def analyze(self, processes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        results = []
        for p in processes:
            name = str(p.get('name', ''))
            pid = p.get('pid', 0)
            
            is_new = name not in self.known_processes
            if is_new and name:
                self.known_processes.add(name)
                
            risk_info = self.get_process_risk(p)
            
            # Return complete process profile enriched with risk metrics
            enriched = {
                **p,
                'pid': pid,
                'name': name,
                'is_new': is_new,
                'is_suspicious': risk_info['score'] > 0.35,
                'anomaly_score': risk_info['score'],
                'risk_explanation': risk_info['explanation'],
                'risk_score': risk_info['score']
            }
            results.append(enriched)
            
        return results

    def get_process_risk(self, process: Dict[str, Any]) -> Dict[str, Any]:
        score = 0.0
        explanations = []
        
        pid = process.get('pid', 0)
        name = str(process.get('name', '')).lower()
        
        # OS idle/kernel system processes legitimately use remaining CPU capacity
        if pid == 0 or name in ('system idle process', 'system'):
            return {
                'score': 0.0,
                'explanation': 'Kernel system idle scheduler'
            }
        
        cpu = process.get('cpu_percent', 0.0) or 0.0
        if cpu > 85:
            score += 0.35
            explanations.append(f"Elevated CPU consumption ({cpu:.1f}%)")
            
        ram = process.get('memory_percent', 0.0) or 0.0
        if ram > 50:
            score += 0.3
            explanations.append(f"Heavy RAM allocation ({ram:.1f}%)")
            
        exe = str(process.get('exe', '') or process.get('exe_path', '')).lower()
        if '\\temp\\' in exe or '\\appdata\\local\\temp' in exe or '\\downloads\\' in exe:
            score += 0.4
            explanations.append("Executing from temporary/downloads directory")
            
        return {
            'score': min(1.0, score),
            'explanation': ", ".join(explanations) if explanations else "Normal host execution"
        }

    def get_process_tree(self, target_pid: int, processes: List[Dict[str, Any]]) -> Dict[str, Any]:
        proc_map = {p.get('pid'): p for p in processes if p.get('pid') is not None}
        target = proc_map.get(target_pid)
        
        if not target:
            return {}
            
        parent = proc_map.get(target.get('ppid'))
        children = [p for p in processes if p.get('ppid') == target_pid]
        
        return {
            'process': target,
            'parent': parent,
            'children': children
        }
