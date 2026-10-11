import psutil
import time
import threading
from typing import Dict, Any, List
from collectors.base import BaseCollector

try:
    from config import settings
    MAX_NETWORK_CONNECTIONS_TRACKED = getattr(settings, 'MAX_NETWORK_CONNECTIONS_TRACKED', 300)
except ImportError:
    MAX_NETWORK_CONNECTIONS_TRACKED = 300


class NetworkCollector(BaseCollector):
    def __init__(self):
        super().__init__()
        self._last_time = time.time()
        try:
            self._last_io = psutil.net_io_counters()
        except Exception:
            self._last_io = None
            
        self._cached_connections: List[Dict[str, Any]] = []
        self._cached_connection_count = 0
        self._lock = threading.Lock()
        self._running = True
        self._stop_event = threading.Event()
        
        # Start a single persistent background worker thread
        self._worker_thread = threading.Thread(
            target=self._worker_loop,
            name="NetworkCollectorWorker",
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
        """Single persistent background loop that periodically gathers socket data."""
        self._do_refresh_conns()
        
        while self._running:
            if self._stop_event.wait(timeout=2.0):
                break
            if not self._running:
                break
            self._do_refresh_conns()

    def _do_refresh_conns(self):
        connections = []
        try:
            for conn in psutil.net_connections(kind='inet'):
                try:
                    status = str(getattr(conn, 'status', 'NONE') or 'NONE')
                    if status.upper() == 'TIME_WAIT':
                        continue

                    laddr_ip = ""
                    laddr_port = 0
                    if conn.laddr:
                        if hasattr(conn.laddr, 'ip'):
                            laddr_ip = str(conn.laddr.ip)
                            laddr_port = int(conn.laddr.port)
                        elif isinstance(conn.laddr, (list, tuple)) and len(conn.laddr) >= 2:
                            laddr_ip = str(conn.laddr[0])
                            laddr_port = int(conn.laddr[1])
                            
                    raddr_ip = ""
                    raddr_port = 0
                    if conn.raddr:
                        if hasattr(conn.raddr, 'ip'):
                            raddr_ip = str(conn.raddr.ip)
                            raddr_port = int(conn.raddr.port)
                        elif isinstance(conn.raddr, (list, tuple)) and len(conn.raddr) >= 2:
                            raddr_ip = str(conn.raddr[0])
                            raddr_port = int(conn.raddr[1])
                            
                    proto = 'TCP' if getattr(conn, 'type', None) == 1 or 'STREAM' in str(getattr(conn, 'type', '')) else 'UDP'
                    pid = getattr(conn, 'pid', None)

                    connections.append({
                        'pid': pid,
                        'process_name': f"PID {pid}" if pid else "System",
                        'local_address': laddr_ip or '0.0.0.0',
                        'local_port': laddr_port,
                        'remote_address': raddr_ip or '*',
                        'remote_port': raddr_port,
                        'protocol': proto,
                        'status': status,
                        'fd': getattr(conn, 'fd', -1)
                    })
                except Exception:
                    continue
        except Exception as e:
            self._last_error = str(e)
            
        with self._lock:
            self._cached_connections = connections[:MAX_NETWORK_CONNECTIONS_TRACKED]
            self._cached_connection_count = len(connections)

    def collect(self) -> Dict[str, Any]:
        data = {}
        
        # 1. Bandwidth Rates (Instant O(1) in-memory)
        try:
            io = psutil.net_io_counters()
            if io and self._last_io:
                current_time = time.time()
                delta_t = current_time - self._last_time
                if delta_t > 0:
                    data['upload_rate'] = max(0.0, (io.bytes_sent - self._last_io.bytes_sent) / delta_t)
                    data['download_rate'] = max(0.0, (io.bytes_recv - self._last_io.bytes_recv) / delta_t)
                else:
                    data['upload_rate'] = 0.0
                    data['download_rate'] = 0.0
            else:
                data['upload_rate'] = 0.0
                data['download_rate'] = 0.0
            self._last_io = io
            self._last_time = time.time()
        except Exception:
            data['upload_rate'] = 0.0
            data['download_rate'] = 0.0
            
        with self._lock:
            conns = self._cached_connections
            count = self._cached_connection_count or len(conns)

        data['connections'] = conns
        data['connection_count'] = count
        data['net_connections_count'] = count
        data['net_upload_rate'] = data.get('upload_rate', 0.0)
        data['net_download_rate'] = data.get('download_rate', 0.0)
        
        return data
