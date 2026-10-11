import threading
from typing import Dict, Any, List
from collectors.cpu import CPUCollector
from collectors.memory import MemoryCollector
from collectors.disk import DiskCollector
from collectors.network import NetworkCollector
from collectors.process import ProcessCollector
from collectors.temperature import TemperatureCollector
from collectors.battery import BatteryCollector
from collectors.system_info import SystemInfoCollector
from collectors.auth_events import AuthEventCollector

class CollectorManager:
    def __init__(self):
        self.collectors = {
            'cpu': CPUCollector(),
            'memory': MemoryCollector(),
            'disk': DiskCollector(),
            'network': NetworkCollector(),
            'process': ProcessCollector(),
            'temperature': TemperatureCollector(),
            'battery': BatteryCollector(),
            'system_info': SystemInfoCollector(),
            'auth_events': AuthEventCollector()
        }
        self._last_snapshot = {}
        self._lock = threading.RLock()

    def collect_all(self) -> Dict[str, Any]:
        snapshot = {}
        for name, collector in self.collectors.items():
            try:
                # safe_collect is on BaseCollector which handles errors
                snapshot[name] = collector.safe_collect()
            except Exception:
                snapshot[name] = None
        with self._lock:
            self._last_snapshot = snapshot
        return snapshot

    def get_telemetry_snapshot(self) -> Dict[str, Any]:
        with self._lock:
            return dict(self._last_snapshot)

    def get_process_snapshot(self) -> List[Dict[str, Any]]:
        with self._lock:
            proc_data = self._last_snapshot.get('process')
        if proc_data and isinstance(proc_data, dict):
            return proc_data.get('processes', [])
        return []

    def get_network_connections(self) -> List[Dict[str, Any]]:
        with self._lock:
            net_data = self._last_snapshot.get('network')
        if net_data and isinstance(net_data, dict):
            return net_data.get('connections', [])
        return []

    def get_auth_events(self) -> Any:
        with self._lock:
            auth_data = self._last_snapshot.get('auth_events')
        if auth_data and isinstance(auth_data, dict):
            events = auth_data.get('auth_events')
            if isinstance(events, list):
                return events
            return events
        return []

    def get_system_info(self) -> Dict[str, Any]:
        with self._lock:
            return dict(self._last_snapshot.get('system_info', {}) or {})

    def get_health(self) -> Dict[str, Any]:
        health = {}
        for name, collector in self.collectors.items():
            health[name] = getattr(collector, '_available', True)
        return health

    def stop(self):
        """Cleanly stop all collector worker threads."""
        for collector in self.collectors.values():
            if hasattr(collector, 'stop') and callable(collector.stop):
                try:
                    collector.stop()
                except Exception:
                    pass
