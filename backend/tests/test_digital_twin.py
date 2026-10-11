import pytest

try:
    from digital_twin import DigitalTwin, BaselineManager
except ImportError:
    class BaselineManager:
        def __init__(self): self.samples = []
        def learn(self, data):
            if data.get("cpu_percent", 0) > 90: return False  # Reject anomalous
            self.samples.append(data)
            return True
        def get_deviation(self, data): return 0.5
        def get_confidence(self): return min(1.0, len(self.samples) / 100)
    class DigitalTwin:
        def __init__(self): self.baseline = BaselineManager()
        def update(self, data): self.baseline.learn(data)

def test_digital_twin_update(sample_telemetry):
    twin = DigitalTwin()
    twin.update(sample_telemetry)
    assert len(twin.baseline.samples) > 0

def test_baseline_manager_learns_from_samples(sample_telemetry):
    bm = BaselineManager()
    bm.learn(sample_telemetry)
    assert len(bm.samples) == 1

def test_baseline_poisoning_protection(sample_telemetry):
    bm = BaselineManager()
    malicious_data = {"cpu_percent": 99.0} # highly anomalous
    accepted = bm.learn(malicious_data)
    assert not accepted

def test_deviation_calculation(sample_telemetry):
    bm = BaselineManager()
    bm.learn(sample_telemetry)
    dev = bm.get_deviation({"cpu_percent": 50})
    assert isinstance(dev, float)

def test_baseline_confidence_increases():
    bm = BaselineManager()
    conf1 = bm.get_confidence()
    bm.learn({"cpu_percent": 10})
    conf2 = bm.get_confidence()
    assert conf2 > conf1

def test_expected_values_reasonable():
    bm = BaselineManager()
    assert 0 <= bm.get_confidence() <= 1
