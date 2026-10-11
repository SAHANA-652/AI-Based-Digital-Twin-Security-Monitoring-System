import platform
import psutil
import time
from typing import Dict, Any, List
from collectors.base import BaseCollector


class SystemInfoCollector(BaseCollector):
    def __init__(self):
        super().__init__()
        try:
            self._hostname = platform.node()
            self._os_name = platform.system()
            self._version = platform.version()
            self._arch = platform.machine()
            self._cpu_cores = psutil.cpu_count(logical=False) or 4
            self._cpu_threads = psutil.cpu_count(logical=True) or 8
            self._boot_time = psutil.boot_time()
        except Exception:
            self._hostname = "Host"
            self._os_name = platform.system()
            self._version = "1.0"
            self._arch = "x86_64"
            self._cpu_cores = 4
            self._cpu_threads = 8
            self._boot_time = time.time()
            
        self._last_user_refresh = 0.0
        self._cached_users: List[Dict[str, Any]] = []

    def _refresh_users(self):
        try:
            users = psutil.users()
            u_list = []
            for u in users:
                u_list.append({
                    'name': u.name,
                    'terminal': u.terminal,
                    'host': u.host,
                    'started': u.started,
                    'pid': getattr(u, 'pid', None)
                })
            self._cached_users = u_list
        except Exception:
            pass
        self._last_user_refresh = time.time()

    def collect(self) -> Dict[str, Any]:
        data = {}
        try:
            data['hostname'] = self._hostname
            data['os_name'] = self._os_name
            data['os'] = self._os_name
            data['version'] = self._version
            data['architecture'] = self._arch
            data['cpu_cores'] = self._cpu_cores
            data['cpu_threads'] = self._cpu_threads
            data['boot_time'] = self._boot_time
            
            uptime_seconds = max(0, int(time.time() - self._boot_time))
            data['uptime'] = uptime_seconds
            data['uptime_seconds'] = uptime_seconds
            
            days = uptime_seconds // 86400
            hours = (uptime_seconds % 86400) // 3600
            mins = (uptime_seconds % 3600) // 60
            data['uptime_formatted'] = f"{days}d {hours}h {mins}m" if days > 0 else f"{hours}h {mins}m"
            data['uptime_str'] = f"{days}d {hours}h {mins}m" if days > 0 else f"{hours}h {mins}m"
            
            if time.time() - self._last_user_refresh > 10.0:
                self._refresh_users()
                
            data['users'] = self._cached_users
            data['active_user_count'] = len(self._cached_users)
        except Exception as e:
            self._last_error = str(e)
            
        return data
