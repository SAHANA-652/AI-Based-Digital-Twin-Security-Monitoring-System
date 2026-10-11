from typing import Dict, Any, Optional
from .baseline import BaselineManager
from .deviation import DeviationCalculator

class DigitalTwin:
    def __init__(self):
        self.current_state: Dict[str, Any] = {}
        self.historical_state: list = []
        
        self.baseline_manager = BaselineManager()
        self.deviation_calculator = DeviationCalculator()
        
        self.metrics = [
            'cpu_percent', 'ram_percent', 'disk_usage', 
            'net_upload_rate', 'net_download_rate', 
            'process_count', 'cpu_temp', 'net_connections_count'
        ]

    @property
    def baseline_state(self) -> Dict[str, Any]:
        return {m: self.baseline_manager.get_baseline(m) for m in self.metrics}
        
    @property
    def expected_state(self) -> Dict[str, Any]:
        return {m: self.baseline_manager.get_expected(m) for m in self.metrics}

    def update(self, telemetry_snapshot: Dict[str, Any]) -> None:
        self.current_state = telemetry_snapshot
        self.historical_state.append(self.current_state)
        if len(self.historical_state) > 60:
            self.historical_state.pop(0)
            
    def get_deviation(self) -> Dict[str, Dict[str, Any]]:
        if not self.current_state:
            return {}
            
        deviations = self.deviation_calculator.calculate(
            self.current_state, 
            self.baseline_state
        )
        
        result = {}
        for metric in self.metrics:
            if metric in self.current_state:
                current = self.current_state[metric]
                baseline = self.baseline_state.get(metric, {})
                expected = self.expected_state.get(metric, current)
                dev_data = deviations.get(metric, {})
                
                result[metric] = {
                    'current': current,
                    'baseline': baseline,
                    'expected': expected,
                    'deviation': dev_data.get('deviation', 0),
                    'status': dev_data.get('status', 'Normal')
                }
        return result

    def get_state_summary(self) -> Dict[str, Any]:
        deviations = self.get_deviation()
        overall_health = 'Normal'
        
        if deviations:
            overall_score = self.deviation_calculator.get_overall_deviation_score(deviations)
            if overall_score > 75:
                overall_health = 'Critical'
            elif overall_score > 50:
                overall_health = 'High'
            elif overall_score > 25:
                overall_health = 'Elevated'
        
        return {
            'overall_health': overall_health,
            'is_trusted_baseline': self.baseline_manager.is_trusted,
            'metrics_tracked': len(self.metrics)
        }
