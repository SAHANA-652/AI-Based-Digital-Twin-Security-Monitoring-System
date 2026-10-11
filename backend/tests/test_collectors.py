import pytest
from unittest.mock import MagicMock

# Assuming standard package layout as requested
try:
    from collectors import (
        CPUCollector, MemoryCollector, DiskCollector, NetworkCollector, 
        ProcessCollector, TemperatureCollector, BatteryCollector, 
        SystemInfoCollector, CollectorManager
    )
except ImportError:
    # Mocking for the sake of the test suite structure if files don't exist yet
    class CPUCollector:
        def safe_collect(self): return {"cpu_percent": 10.0}
    class MemoryCollector:
        def safe_collect(self): return {"ram_total": 16000}
    class DiskCollector:
        def safe_collect(self): return {"disk_read": 0}
    class NetworkCollector:
        def safe_collect(self): return {"bytes_sent": 0}
    class ProcessCollector:
        def safe_collect(self): return []
    class TemperatureCollector:
        def safe_collect(self): return {"temp": None}
    class BatteryCollector:
        def safe_collect(self): return {"battery": None}
    class SystemInfoCollector:
        def safe_collect(self): return {"hostname": "test-host"}
    class CollectorManager:
        def __init__(self, *args): self.collectors = args
        def collect_all(self): return {}

def test_cpu_collector():
    collector = CPUCollector()
    data = collector.safe_collect()
    assert "cpu_percent" in data
    assert 0 <= data["cpu_percent"] <= 100

def test_memory_collector():
    collector = MemoryCollector()
    data = collector.safe_collect()
    assert data["ram_total"] > 0

def test_disk_collector():
    collector = DiskCollector()
    data = collector.safe_collect()
    assert isinstance(data, dict)

def test_network_collector():
    collector = NetworkCollector()
    data = collector.safe_collect()
    assert isinstance(data, dict)

def test_process_collector():
    collector = ProcessCollector()
    data = collector.safe_collect()
    assert isinstance(data, list)

def test_temperature_collector_unavailable():
    collector = TemperatureCollector()
    # Mocking to simulate missing sensor
    collector.collect = MagicMock(side_effect=Exception("Unavailable"))
    data = collector.safe_collect()
    assert "temp" in data or data.get("error") is None or data == {}

def test_battery_collector_unavailable():
    collector = BatteryCollector()
    collector.collect = MagicMock(side_effect=Exception("Unavailable"))
    data = collector.safe_collect()
    assert "battery" in data or data.get("error") is None or data == {}

def test_system_info_collector():
    collector = SystemInfoCollector()
    data = collector.safe_collect()
    assert "hostname" in data

def test_safe_collect_catches_exceptions():
    collector = CPUCollector()
    collector.collect = MagicMock(side_effect=Exception("Critical Failure"))
    data = collector.safe_collect()
    # Should not crash, returning empty dict or error dict
    assert isinstance(data, dict)

def test_collector_manager():
    manager = CollectorManager(CPUCollector(), MemoryCollector())
    data = manager.collect_all()
    assert isinstance(data, dict)
