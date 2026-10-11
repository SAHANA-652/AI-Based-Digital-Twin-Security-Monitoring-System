import uuid
import time
from typing import Dict, Any, Optional
from .scenarios import (
    CryptominingScenario, NetworkFloodScenario, BruteForceScenario,
    MalwareScenario, DataExfiltrationScenario, RansomwareScenario, CustomScenario
)


class SimulationEngine:
    def __init__(self):
        self._is_active = False
        self.current_scenario = None
        self.scenario_name: Optional[str] = None
        self.session_id: Optional[str] = None
        self.start_time: float = 0.0

        self.scenario_map = {
            'cryptomining': CryptominingScenario,
            'network_flood': NetworkFloodScenario,
            'brute_force': BruteForceScenario,
            'malware': MalwareScenario,
            'data_exfiltration': DataExfiltrationScenario,
            'ransomware': RansomwareScenario,
            'custom': CustomScenario
        }

    @property
    def is_active(self) -> bool:
        return self._is_active

    @is_active.setter
    def is_active(self, value: bool) -> None:
        self._is_active = bool(value)

    def check_active(self) -> bool:
        return self._is_active

    def start_simulation(self, scenario_type: str, parameters: Dict[str, Any] = None) -> str:
        scenario_key = scenario_type.lower()
        if scenario_key not in self.scenario_map:
            scenario_key = 'custom'

        scenario_cls = self.scenario_map[scenario_key]
        self.current_scenario = scenario_cls(parameters or {})
        self.scenario_name = scenario_key

        self._is_active = True
        self.session_id = str(uuid.uuid4())
        self.start_time = time.time()

        return self.session_id

    def stop_simulation(self) -> None:
        self._is_active = False
        self.current_scenario = None
        self.scenario_name = None
        self.session_id = None
        self.start_time = 0.0

    def get_simulated_telemetry(self, base_telemetry: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Overlay simulated telemetry on top of real telemetry.
        Never modifies the real telemetry permanently.
        """
        result = (base_telemetry or {}).copy()
        if not self._is_active or not self.current_scenario:
            result['is_simulation'] = False
            return result

        elapsed = time.time() - self.start_time
        sim_values = self.current_scenario.get_simulated_values(elapsed)

        for k, v in sim_values.items():
            result[k] = v

        result['is_simulation'] = True
        result['simulation_session'] = self.session_id

        return result
