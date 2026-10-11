import os
from datetime import datetime, timezone
import psutil
from typing import Dict, Any, List
from collectors.base import BaseCollector


class AuthEventCollector(BaseCollector):
    def __init__(self):
        super().__init__()
        self._last_read_pos = 0

    def collect(self) -> Dict[str, Any]:
        data = {}
        events: List[Dict[str, Any]] = []
        status_msg = "Available"
        
        # 1. Real active logged-in host sessions via kernel psutil.users()
        try:
            active_users = psutil.users()
            for u in active_users:
                started_dt = datetime.fromtimestamp(u.started, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S") if u.started else "Current Session"
                events.append({
                    "timestamp": started_dt,
                    "event_type": "User Session Active",
                    "username": u.name or "User",
                    "source": u.host or "Local Console",
                    "terminal": u.terminal or "Console",
                    "success": True,
                    "method": "Local Interactive",
                    "is_suspicious": False
                })
        except Exception as e:
            self._last_error = str(e)

        # 2. Check platform-specific event log availability
        if self.os_type == 'windows':
            status_msg = "Live active logon sessions tracked via OS kernel. Windows Security Event Log requires elevated Administrator privileges."
        elif self.os_type == 'linux':
            log_file = '/var/log/auth.log' if os.path.exists('/var/log/auth.log') else '/var/log/secure'
            if os.path.exists(log_file):
                try:
                    with open(log_file, 'r') as f:
                        lines = f.readlines()
                        for line in lines[-20:]:
                            events.append({
                                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                                "event_type": "Linux PAM Auth",
                                "username": "system",
                                "source": log_file,
                                "raw": line.strip(),
                                "success": "Accepted" in line,
                                "is_suspicious": "Failed" in line
                            })
                except Exception:
                    pass
            else:
                status_msg = "Unavailable on this system"
        elif self.os_type == 'macos':
            status_msg = "Live active sessions tracked via kernel."

        data['auth_events'] = events
        data['status'] = status_msg
        data['total_count'] = len(events)
        return data
