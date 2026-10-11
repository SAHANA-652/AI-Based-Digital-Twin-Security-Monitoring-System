import psutil
from typing import Dict, Any
from collectors.base import BaseCollector

class MemoryCollector(BaseCollector):
    def collect(self) -> Dict[str, Any]:
        data = {}
        try:
            vm = psutil.virtual_memory()
            data['ram_total'] = vm.total
            data['ram_used'] = vm.used
            data['ram_available'] = vm.available
            data['ram_percent'] = vm.percent
        except Exception as e:
            self._last_error = str(e)
            data['ram_total'] = "Unavailable on this system"
            
        try:
            swap = psutil.swap_memory()
            data['swap_total'] = swap.total
            data['swap_used'] = swap.used
            data['swap_percent'] = swap.percent
        except Exception as e:
            self._last_error = str(e)
            data['swap_total'] = "Unavailable on this system"
            
        return data
