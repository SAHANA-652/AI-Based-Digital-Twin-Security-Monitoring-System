import psutil
import time
from typing import Dict, Any, List
from collectors.base import BaseCollector

class DiskCollector(BaseCollector):
    def __init__(self):
        super().__init__()
        self._last_time = time.time()
        self._last_partition_refresh = 0.0
        self._cached_partitions: List[Dict[str, Any]] = []
        try:
            self._last_io = psutil.disk_io_counters()
        except Exception:
            self._last_io = None
        self._refresh_partitions()

    def _refresh_partitions(self):
        partitions_data = []
        try:
            partitions = psutil.disk_partitions(all=False)
            for p in partitions:
                try:
                    usage = psutil.disk_usage(p.mountpoint)
                    partitions_data.append({
                        'device': p.device,
                        'mountpoint': p.mountpoint,
                        'fstype': p.fstype,
                        'total': usage.total,
                        'used': usage.used,
                        'free': usage.free,
                        'percent': usage.percent
                    })
                except Exception:
                    continue
        except Exception:
            pass
        self._cached_partitions = partitions_data
        self._last_partition_refresh = time.time()

    def collect(self) -> Dict[str, Any]:
        data = {}
        
        # Refresh partition statistics only once every 30 seconds
        if time.time() - self._last_partition_refresh > 30.0:
            self._refresh_partitions()
            
        data['partitions'] = self._cached_partitions
        data['disk_partitions'] = self._cached_partitions
        
        try:
            io = psutil.disk_io_counters()
            if io and self._last_io:
                current_time = time.time()
                delta_t = current_time - self._last_time
                if delta_t > 0:
                    data['read_rate'] = max(0.0, (io.read_bytes - self._last_io.read_bytes) / delta_t)
                    data['write_rate'] = max(0.0, (io.write_bytes - self._last_io.write_bytes) / delta_t)
                else:
                    data['read_rate'] = 0.0
                    data['write_rate'] = 0.0
            else:
                data['read_rate'] = 0.0
                data['write_rate'] = 0.0
            self._last_io = io
            self._last_time = time.time()
        except Exception:
            data['read_rate'] = 0.0
            data['write_rate'] = 0.0
            
        data['disk_read_rate'] = data['read_rate']
        data['disk_write_rate'] = data['write_rate']
        return data
