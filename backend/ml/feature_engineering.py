import collections
import datetime
import numpy as np
from typing import Dict, List, Any

class FeatureEngineer:
    """
    Feature Engineering component for raw telemetry snapshots.
    Maintains sliding windows and computes derived features.
    """
    def __init__(self):
        self.windows_1s = collections.deque(maxlen=1)
        self.windows_5s = collections.deque(maxlen=5)
        self.windows_30s = collections.deque(maxlen=30)
        self.windows_5m = collections.deque(maxlen=300)
        
        self.feature_names = [
            "cpu_percent", "ram_percent", "net_upload_download_ratio",
            "net_burst_score", "process_creation_rate", "disk_write_burst",
            "cpu_rolling_mean", "cpu_rolling_std",
            "ram_rolling_mean", "ram_rolling_std",
            "net_rolling_mean", "net_rolling_std",
            "cpu_change_rate", "ram_change_rate",
            "time_hour", "is_business_hours"
        ]

    def get_feature_names(self) -> List[str]:
        return self.feature_names

    def process_snapshot(self, snapshot: Dict[str, Any]) -> None:
        """Add a new raw telemetry snapshot to the sliding windows."""
        self.windows_1s.append(snapshot)
        self.windows_5s.append(snapshot)
        self.windows_30s.append(snapshot)
        self.windows_5m.append(snapshot)

    def update(self, snapshot: Dict[str, Any]) -> None:
        """Alias for process_snapshot."""
        self.process_snapshot(snapshot)

    def _get_metric_history(self, window: collections.deque, key: str) -> List[float]:
        return [s.get(key, 0.0) for s in window]

    def _calculate_change_rate(self, window: collections.deque, key: str) -> float:
        if len(window) < 2:
            return 0.0
        return float(window[-1].get(key, 0.0) - window[0].get(key, 0.0))

    def _get_z_score(self, val: float, mean: float, std: float) -> float:
        if std == 0:
            return 0.0
        return (val - mean) / std

    def get_feature_vector(self) -> np.ndarray:
        """
        Compute derived features from sliding windows and return as a numpy array.
        """
        if not self.windows_1s:
            return np.zeros(len(self.feature_names))
            
        current = self.windows_1s[-1]
        
        # Raw metrics
        cpu = current.get("cpu_percent", 0.0)
        ram = current.get("ram_percent", 0.0)
        net_up = current.get("net_bytes_sent", 0.0)
        net_down = current.get("net_bytes_recv", 0.0)
        
        # Derived metrics
        net_ratio = net_up / net_down if net_down > 0 else (net_up if net_up > 0 else 0)
        
        # Change rates
        cpu_change = self._calculate_change_rate(self.windows_5s, "cpu_percent")
        ram_change = self._calculate_change_rate(self.windows_5s, "ram_percent")
        
        # Rolling stats (30s window)
        cpu_hist = self._get_metric_history(self.windows_30s, "cpu_percent")
        ram_hist = self._get_metric_history(self.windows_30s, "ram_percent")
        net_hist = [s.get("net_bytes_sent", 0) + s.get("net_bytes_recv", 0) for s in self.windows_30s]
        
        cpu_mean = np.mean(cpu_hist) if cpu_hist else 0.0
        cpu_std = np.std(cpu_hist) if cpu_hist else 0.0
        ram_mean = np.mean(ram_hist) if ram_hist else 0.0
        ram_std = np.std(ram_hist) if ram_hist else 0.0
        net_mean = np.mean(net_hist) if net_hist else 0.0
        net_std = np.std(net_hist) if net_hist else 0.0
        
        # Burst scores (comparing 5s to 30s)
        current_net = net_up + net_down
        net_burst = self._get_z_score(current_net, net_mean, net_std)
        
        disk_write = current.get("disk_write_bytes", 0.0)
        disk_hist = self._get_metric_history(self.windows_30s, "disk_write_bytes")
        disk_mean = np.mean(disk_hist) if disk_hist else 0.0
        disk_std = np.std(disk_hist) if disk_hist else 0.0
        disk_write_burst = self._get_z_score(disk_write, disk_mean, disk_std)
        
        process_count = current.get("process_count", 0)
        proc_hist = self._get_metric_history(self.windows_30s, "process_count")
        process_creation_rate = process_count - proc_hist[0] if proc_hist else 0
        
        # Time of day
        now = datetime.datetime.now()
        time_hour = now.hour
        is_business = 1.0 if 8 <= time_hour <= 18 and now.weekday() < 5 else 0.0
        
        features = [
            cpu, ram, net_ratio, net_burst, process_creation_rate, disk_write_burst,
            cpu_mean, cpu_std, ram_mean, ram_std, net_mean, net_std,
            cpu_change, ram_change, float(time_hour), is_business
        ]
        
        return np.array(features, dtype=np.float32)
