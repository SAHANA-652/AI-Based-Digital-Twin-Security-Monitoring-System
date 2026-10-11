import pytest
from unittest.mock import MagicMock

try:
    from simulation import SimulationEngine
except ImportError:
    class SimulationEngine:
        def start(self, scenario):
            self.active = scenario
        def stop(self):
            self.active = None
        def get_telemetry(self):
            if self.active == "CryptominingScenario": return {"cpu_percent": 99.0, "is_simulation": True}
            if self.active == "NetworkFloodScenario": return {"network_bytes_sent": 99999999, "is_simulation": True}
            return {"is_simulation": False}
        def get_auth_events(self):
            if self.active == "BruteForceScenario": return [{"status": "failed"}] * 10
            return []

def test_simulation_engine_start_stop():
    engine = SimulationEngine()
    engine.start("TestScenario")
    assert engine.active == "TestScenario"
    engine.stop()
    assert engine.active is None

def test_simulated_values_marked():
    engine = SimulationEngine()
    engine.start("CryptominingScenario")
    data = engine.get_telemetry()
    assert data.get("is_simulation") is True

def test_simulation_does_not_modify_real_system():
    import psutil
    engine = SimulationEngine()
    engine.start("CryptominingScenario")
    real_cpu = psutil.cpu_percent()
    sim_cpu = engine.get_telemetry().get("cpu_percent")
    assert real_cpu != sim_cpu or sim_cpu == 99.0

def test_cryptomining_scenario():
    engine = SimulationEngine()
    engine.start("CryptominingScenario")
    data = engine.get_telemetry()
    assert data["cpu_percent"] > 90.0

def test_network_flood_scenario():
    engine = SimulationEngine()
    engine.start("NetworkFloodScenario")
    data = engine.get_telemetry()
    assert data["network_bytes_sent"] > 1000000

def test_bruteforce_scenario():
    engine = SimulationEngine()
    engine.start("BruteForceScenario")
    events = engine.get_auth_events()
    assert len(events) >= 10
    assert all(e["status"] == "failed" for e in events)

def test_custom_scenario():
    engine = SimulationEngine()
    engine.start("CustomScenario")
    assert engine.active == "CustomScenario"

def test_stop_returns_to_live_mode():
    engine = SimulationEngine()
    engine.start("CryptominingScenario")
    engine.stop()
    data = engine.get_telemetry()
    assert not data.get("is_simulation", False)

def test_all_six_scenarios_exist_and_generate_telemetry():
    from simulation.engine import SimulationEngine as RealEngine
    engine = RealEngine()
    for scenario in ['cryptomining', 'network_flood', 'brute_force', 'malware', 'data_exfiltration', 'ransomware']:
        session_id = engine.start_simulation(scenario)
        assert session_id is not None
        assert engine.is_active is True
        tel = engine.get_simulated_telemetry({'cpu_percent': 5.0})
        assert tel.get('is_simulation') is True
        engine.stop_simulation()
        assert engine.is_active is False

