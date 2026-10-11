import json
import math
import os
from typing import Dict, Any

try:
    from config import settings
except ImportError:
    class MockSettings:
        BASELINE_ADAPTATION_RATE = 0.05
        BASELINE_POISONING_THRESHOLD = 3.0
        BASELINE_MIN_SAMPLES = 100
    settings = MockSettings()


class BaselineManager:
    def __init__(self):
        self.metrics_data: Dict[str, list] = {}
        self.stats: Dict[str, Dict[str, float]] = {}
        self.sample_count = 0
        self.confidence = 0.0
        self.history = []
        self._is_trusted_override = None
        self.adaptation_rate = getattr(settings, "BASELINE_ADAPTATION_RATE", 0.01)
        self.poisoning_threshold = getattr(settings, "BASELINE_POISONING_THRESHOLD", 3.0)
        self.min_samples_trust = getattr(settings, "BASELINE_MIN_SAMPLES", getattr(settings, "MIN_SAMPLES_TRUST", 100))

    @property
    def is_trusted(self) -> bool:
        if self._is_trusted_override is not None:
            return self._is_trusted_override
        return self.sample_count >= self.min_samples_trust

    @is_trusted.setter
    def is_trusted(self, value: bool) -> None:
        self._is_trusted_override = bool(value)

    def update(self, telemetry: Dict[str, Any], anomaly_score: float = 0) -> None:
        # Don't learn from highly anomalous data (poisoning protection)
        if anomaly_score > 0.7:
            return
            
        self.sample_count += 1
        
        # Increase confidence up to 1.0 based on sample count
        if self.sample_count <= self.min_samples_trust * 2:
            self.confidence = min(1.0, self.sample_count / (self.min_samples_trust * 2))
        else:
            self.confidence = 1.0
            
        for metric, value in telemetry.items():
            if not isinstance(value, (int, float)):
                continue
                
            if metric not in self.metrics_data:
                self.metrics_data[metric] = []
                
            # Check z-score against current baseline if trusted (z-score gating)
            if self.is_trusted and metric in self.stats:
                mean = self.stats[metric].get('mean', 0)
                std = self.stats[metric].get('std', 1)
                
                if std > 0:
                    z_score = abs(value - mean) / std
                    if z_score > self.poisoning_threshold:
                        continue  # Reject update, potential poisoning
                        
            # Keep bounded recent window (200 samples is ideal for stats and fast sorting)
            self.metrics_data[metric].append(float(value))
            if len(self.metrics_data[metric]) > 200:
                self.metrics_data[metric].pop(0)
                
            self._recalculate_stats(metric)

    def _recalculate_stats(self, metric: str) -> None:
        data = self.metrics_data[metric]
        if not data:
            return
            
        n = len(data)
        mean = sum(data) / n
        variance = sum((x - mean) ** 2 for x in data) / n
        std = math.sqrt(variance)
        
        sorted_data = sorted(data)
        
        def percentile(p):
            k = (n - 1) * p
            f = math.floor(k)
            c = math.ceil(k)
            if f == c:
                return sorted_data[int(k)]
            d0 = sorted_data[int(f)] * (c - k)
            d1 = sorted_data[int(c)] * (k - f)
            return d0 + d1

        self.stats[metric] = {
            'mean': mean,
            'std': std,
            'min': sorted_data[0],
            'max': sorted_data[-1],
            'p25': percentile(0.25),
            'p50': percentile(0.50),
            'p75': percentile(0.75),
            'p95': percentile(0.95),
        }

    def get_baseline(self, metric: str) -> Dict[str, float]:
        return self.stats.get(metric, {})

    def get_expected(self, metric: str) -> float:
        return self.stats.get(metric, {}).get('mean', 0.0)

    def get_learning_progress(self) -> Dict[str, Any]:
        return {
            'sample_count': self.sample_count,
            'confidence': self.confidence,
            'is_trusted': self.is_trusted
        }

    def save(self, path: str) -> None:
        data = {
            'stats': self.stats,
            'sample_count': self.sample_count,
            'confidence': self.confidence
        }
        with open(path, 'w') as f:
            json.dump(data, f)
            
    def load(self, path: str) -> None:
        if os.path.exists(path):
            with open(path, 'r') as f:
                data = json.load(f)
                self.stats = data.get('stats', {})
                self.sample_count = data.get('sample_count', 0)
                self.confidence = data.get('confidence', 0.0)
