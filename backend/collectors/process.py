import psutil
import threading
import time
from typing import Dict, Any, List
from collectors.base import BaseCollector

try:
    from config import settings
    MAX_PROCESSES_TRACKED = getattr(settings, 'MAX_PROCESSES_TRACKED', 200)
except ImportError:
    MAX_PROCESSES_TRACKED = 200


class ProcessCollector(BaseCollector):
    def __init__(self):
        super().__init__()
        self._cached_processes: List[Dict[str, Any]] = []
        self._cached_total = 0
        self._static_cache: Dict[int, Dict[str, Any]] = {}
        self._lock = threading.Lock()
        self._running = True
        self._stop_event = threading.Event()
        
        # Start a single persistent background worker thread
        self._worker_thread = threading.Thread(
            target=self._worker_loop,
            name="ProcessCollectorWorker",
            daemon=True
        )
        self._worker_thread.start()

    def stop(self):
        """Cleanly stop the background worker thread."""
        self._running = False
        self._stop_event.set()
        if self._worker_thread.is_alive():
            self._worker_thread.join(timeout=2.0)

    def _worker_loop(self):
        """Single persistent background loop that periodically gathers process data."""
        # Initial immediate collection
        self._do_refresh()
        
        while self._running:
            # Sleep 1.5s between refreshes, or awake early on stop
            if self._stop_event.wait(timeout=1.5):
                break
            if not self._running:
                break
            self._do_refresh()

    def _do_refresh(self):
        try:
            pids = psutil.pids()
            total_count = len(pids)
            processes = []
            name_by_pid = {}
            current_pids = set(pids)

            # Clean stale static cache periodically
            with self._lock:
                stale_pids = set(self._static_cache.keys()) - current_pids
                for sp in stale_pids:
                    self._static_cache.pop(sp, None)

            # Fast single-pass iteration with specific attributes
            for p in psutil.process_iter(['pid', 'ppid', 'name', 'cpu_percent', 'memory_percent', 'memory_info', 'status', 'username']):
                try:
                    pinfo = p.info
                    pid = pinfo.get('pid')
                    if pid is None:
                        continue
                        
                    name = pinfo.get('name') or 'unknown'
                    name_by_pid[pid] = name
                    ppid = pinfo.get('ppid')
                    username = pinfo.get('username') or 'System'

                    # Fast static metadata caching without blocking WMI/RPC calls
                    if pid not in self._static_cache:
                        if pid == 0:
                            self._static_cache[pid] = {
                                'ppid': 0,
                                'username': 'NT AUTHORITY\\SYSTEM',
                                'exe_path': 'System Idle Process',
                                'cmdline_str': 'System Idle Process'
                            }
                        else:
                            self._static_cache[pid] = {
                                'ppid': ppid,
                                'username': username,
                                'exe_path': name,
                                'cmdline_str': name
                            }

                    # Attach static attributes
                    pinfo.update(self._static_cache.get(pid, {}))

                    # Extract RSS memory in bytes safely
                    mem_info = pinfo.get('memory_info')
                    rss = getattr(mem_info, 'rss', 0) if mem_info else 0
                    pinfo['memory_rss'] = rss
                    processes.append(pinfo)
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    continue
                except Exception:
                    continue

            # Attach parent names
            for p in processes:
                p_ppid = p.get('ppid')
                p['parent_name'] = name_by_pid.get(p_ppid, f"PID {p_ppid}" if p_ppid else "None (Root)")

            # Sort top processes by resource consumption
            processes.sort(
                key=lambda x: (x.get('cpu_percent') or 0) + (x.get('memory_percent') or 0),
                reverse=True
            )

            with self._lock:
                self._cached_processes = processes[:MAX_PROCESSES_TRACKED]
                self._cached_total = total_count
        except Exception as e:
            self._last_error = str(e)

    def collect(self) -> Dict[str, Any]:
        """Instant O(1) non-blocking snapshot retrieval."""
        with self._lock:
            total = self._cached_total or len(self._cached_processes)
            procs = self._cached_processes

        return {
            'processes': procs,
            'total_count': total
        }
