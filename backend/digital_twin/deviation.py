from typing import Dict, Any

class DeviationCalculator:
    def calculate(self, current: Dict[str, Any], baseline: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        deviations = {}
        for metric, current_val in current.items():
            if not isinstance(current_val, (int, float)):
                continue
                
            base_stats = baseline.get(metric, {}) if isinstance(baseline, dict) else {}
            mean = base_stats.get('mean') if isinstance(base_stats, dict) else None
            std = base_stats.get('std') if isinstance(base_stats, dict) else None
            
            if mean is None:
                mean = current_val
            if std is None or std <= 0:
                std = max(1.0, current_val * 0.1)
            
            deviation = (current_val - mean) / std if std > 0 else 0.0
            abs_dev = abs(deviation)
            
            if abs_dev < 1.5:
                status = 'Normal'
            elif abs_dev < 2.5:
                status = 'Elevated'
            elif abs_dev < 3.5:
                status = 'High'
            else:
                status = 'Critical'
                
            deviations[metric] = {
                'current': current_val,
                'expected': mean,
                'baseline_mean': mean,
                'baseline_std': std,
                'deviation': round(deviation, 2),
                'status': status
            }
            
        return deviations

    def get_overall_deviation_score(self, deviations: Dict[str, Dict[str, Any]]) -> float:
        if not deviations:
            return 0.0
            
        total_score = 0.0
        max_possible = len(deviations) * 100.0
        
        for metric, data in deviations.items():
            status = data.get('status', 'Normal')
            if status == 'Critical':
                total_score += 100
            elif status == 'High':
                total_score += 75
            elif status == 'Elevated':
                total_score += 40
            else:
                total_score += 0
                
        if max_possible == 0:
            return 0.0
            
        score = (total_score / max_possible) * 100
        return min(100.0, max(0.0, score))
