import psutil
import time
from typing import Dict, Any
from collectors.base import BaseCollector

class CPUCollector(BaseCollector):
    def __init__(self):
        super().__init__()
        # Initial non-blocking seed
        try:
            psutil.cpu_percent(interval=None)
        except Exception:
            pass

    def collect(self) -> Dict[str, Any]:
        data = {}
        try:
            total = float(psutil.cpu_percent(interval=None))
            per_core = psutil.cpu_percent(interval=None, percpu=True)
            data['total_usage'] = total
            data['cpu_percent'] = total
            data['per_core'] = [float(c) for c in per_core] if isinstance(per_core, list) else []
            data['core_usage'] = data['per_core']
        except Exception:
            data['total_usage'] = 0.0
            data['cpu_percent'] = 0.0
            data['per_core'] = []
            data['core_usage'] = []
            
        try:
            freq = psutil.cpu_freq()
            if freq:
                data['frequency_current'] = freq.current
                data['frequency_min'] = freq.min
                data['frequency_max'] = freq.max
            else:
                data['frequency_current'] = "Unavailable on this system"
        except Exception:
            data['frequency_current'] = "Unavailable on this system"
            
        if self.os_type in ('linux', 'macos'):
            try:
                data['load_average'] = psutil.getloadavg()
            except Exception:
                data['load_average'] = "Unavailable on this system"
        else:
            data['load_average'] = data['total_usage']
            
        return data
