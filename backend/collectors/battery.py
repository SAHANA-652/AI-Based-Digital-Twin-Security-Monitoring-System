import psutil
from typing import Dict, Any
from collectors.base import BaseCollector


class BatteryCollector(BaseCollector):
    def collect(self) -> Dict[str, Any]:
        data = {}
        try:
            if hasattr(psutil, 'sensors_battery'):
                batt = psutil.sensors_battery()
                if batt is not None:
                    self._available = True
                    secs = batt.secsleft
                    plugged = batt.power_plugged
                    
                    time_remaining_str = "Plugged in (Unlimited)" if (plugged or secs == -2) else (
                        f"{int(secs // 3600)}h {int((secs % 3600) // 60)}m" if secs > 0 else "Calculating..."
                    )
                    
                    data['percent'] = float(batt.percent)
                    data['power_plugged'] = bool(plugged) if plugged is not None else None
                    data['charging'] = bool(plugged) if plugged is not None else None
                    data['secsleft'] = int(secs) if isinstance(secs, (int, float)) and secs >= 0 else None
                    data['time_remaining'] = time_remaining_str
                    data['status'] = "Plugged in" if plugged else "On Battery"
                else:
                    self._available = False
                    data['percent'] = None
                    data['status'] = "Not applicable"
                    data['time_remaining'] = "Not applicable (Desktop)"
            else:
                self._available = False
                data['percent'] = None
                data['status'] = "Unavailable on this system"
                data['time_remaining'] = "Unavailable on this system"
        except Exception as e:
            self._available = False
            self._last_error = str(e)
            data['percent'] = None
            data['status'] = "Unavailable on this system"
            data['time_remaining'] = "Unavailable on this system"
            
        return data
