import psutil
import platform
import subprocess
from typing import Dict, Any
from collectors.base import BaseCollector


def _get_windows_temp_wmi():
    """Try WMI thermal zone sensor (Windows, may need admin for some configs)."""
    try:
        result = subprocess.run(
            ['wmic', '/namespace:\\\\root\\wmi', 'PATH',
             'MSAcpi_ThermalZoneTemperature', 'get', 'CurrentTemperature'],
            capture_output=True, text=True, timeout=3, shell=False
        )
        lines = [l.strip() for l in result.stdout.strip().splitlines()
                 if l.strip().isdigit()]
        if lines:
            # Values are in tenths of Kelvin
            return round((int(lines[0]) / 10.0) - 273.15, 1)
    except Exception:
        pass
    return None


def _get_cpu_estimated_temp():
    """CPU-load derived thermal estimate when sensors are unavailable.

    Model: idle base ~38°C, scales to ~90°C at 100% CPU load.
    Realistic for typical laptop/desktop thermal profiles.
    """
    try:
        cpu = psutil.cpu_percent(interval=None)
    except Exception:
        cpu = 30.0
    return round(38.0 + (cpu * 0.52), 1)


class TemperatureCollector(BaseCollector):
    def collect(self) -> Dict[str, Any]:
        data: Dict[str, Any] = {}
        os_name = platform.system().lower()

        # Linux / macOS — use psutil sensors
        if os_name in ('linux', 'darwin'):
            try:
                if hasattr(psutil, 'sensors_temperatures'):
                    temps = psutil.sensors_temperatures()
                    if temps:
                        for key in ('coretemp', 'k10temp', 'cpu_thermal', 'acpitz'):
                            if key in temps and temps[key]:
                                data['cpu_temp'] = round(temps[key][0].current, 1)
                                data['temp_source'] = 'sensor'
                                return data
                        first_key = next(iter(temps))
                        if temps[first_key]:
                            data['cpu_temp'] = round(temps[first_key][0].current, 1)
                            data['temp_source'] = 'sensor'
                            return data
            except Exception:
                pass

        # Windows — try WMI first, then CPU-load estimate
        if os_name == 'windows':
            wmi_temp = _get_windows_temp_wmi()
            if wmi_temp is not None and 10.0 < wmi_temp < 120.0:
                data['cpu_temp'] = wmi_temp
                data['temp_source'] = 'wmi'
                return data
            # WMI unavailable — derive from CPU load
            data['cpu_temp'] = _get_cpu_estimated_temp()
            data['temp_source'] = 'estimated'
            return data

        # Fallback for any other OS
        data['cpu_temp'] = _get_cpu_estimated_temp()
        data['temp_source'] = 'estimated'
        return data
