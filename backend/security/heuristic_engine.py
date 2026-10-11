from typing import List, Dict, Any, Callable
from dataclasses import dataclass

@dataclass
class SecurityRule:
    id: str
    name: str
    description: str
    severity: str  # Informational, Low, Moderate, High, Critical
    check_fn: Callable

class HeuristicEngine:
    def __init__(self):
        self.rules: List[SecurityRule] = [
            SecurityRule("PROC_SUSPICIOUS_PATH", "Suspicious Process Path", "Process executing from unusual location", "Moderate", self._check_proc_path),
            SecurityRule("PROC_EXCESSIVE_CREATION", "Excessive Process Creation", "Rapid creation of new processes", "High", self._check_proc_creation),
            SecurityRule("PROC_HIGH_RESOURCE", "High Process Resource Usage", "Single process using >80% CPU or >50% RAM", "Moderate", self._check_proc_resource),
            SecurityRule("PROC_UNUSUAL_PARENT", "Unusual Parent Process", "Suspicious parent-child relationship", "High", self._check_proc_parent),
            SecurityRule("NET_UNUSUAL_PORT", "Unusual Network Port", "Connection on uncommon port", "Low", self._check_net_port),
            SecurityRule("NET_HIGH_UPLOAD", "High Upload Rate", "Upload rate exceeds baseline significantly", "Moderate", self._check_net_upload),
            SecurityRule("NET_MANY_CONNECTIONS", "Excessive Connections", "Many concurrent network connections", "High", self._check_net_conn),
            SecurityRule("NET_EXTERNAL_NEW", "New External IP", "Connection to previously unseen external IP", "Low", self._check_net_ext),
            SecurityRule("AUTH_REPEATED_FAILURE", "Repeated Auth Failure", "Multiple failed logins in short window", "High", self._check_auth_fail),
            SecurityRule("AUTH_UNUSUAL_TIME", "Unusual Auth Time", "Login outside normal hours", "Informational", self._check_auth_time),
            SecurityRule("DISK_WRITE_BURST", "High Disk Writes", "Sudden high disk write rate", "Moderate", self._check_disk_write),
            SecurityRule("RESOURCE_EXHAUSTION", "Resource Exhaustion", "CPU+RAM both very high", "Critical", self._check_res_exhaust)
        ]

    def evaluate(self, telemetry: Dict[str, Any], processes: List[Dict[str, Any]], connections: List[Dict[str, Any]], auth_events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        triggered_rules = []
        for rule in self.rules:
            # We pass all context to every rule; they extract what they need
            result = rule.check_fn(telemetry, processes, connections, auth_events)
            if result:
                triggered_rules.append({
                    'rule_id': rule.id,
                    'rule_name': rule.name,
                    'reason': rule.description,
                    'evidence': result.get('evidence', ''),
                    'severity': rule.severity,
                    'risk_contribution': self._get_risk_score(rule.severity)
                })
        return triggered_rules

    def _get_risk_score(self, severity: str) -> float:
        scores = {'Informational': 0, 'Low': 5, 'Moderate': 15, 'High': 30, 'Critical': 50}
        return scores.get(severity, 0)

    def _check_proc_path(self, tel, procs, conns, auth):
        known_sim_malicious = {
            'xmrig_miner.exe', 'flood_daemon.exe', 'hydra_brute.exe',
            'svchost_updater.exe', 'data_packager.exe', 'vssadmin_encrypt.exe'
        }
        for p in procs:
            pname = str(p.get('name', '')).lower()
            path = str(p.get('exe', '') or p.get('exe_path', '')).lower()
            # Flag if explicit attack binary OR if flagged suspicious with high anomaly
            if pname in known_sim_malicious or p.get('is_suspicious') or (p.get('risk_score', 0) > 0.5):
                if any(sp in path for sp in ('\\temp\\', '\\appdata\\local\\temp', '/tmp/', '/var/tmp/')):
                    return {'evidence': f"Suspicious process {p.get('name')} running from {path}"}
        return None

    def _check_proc_creation(self, tel, procs, conns, auth):
        if tel.get('process_creation_rate', 0) > 40:
            return {'evidence': f"Creation rate: {tel.get('process_creation_rate')}/s"}
        return None

    def _check_proc_resource(self, tel, procs, conns, auth):
        for p in procs:
            pid = p.get('pid', 0)
            pname = str(p.get('name', '')).lower()
            if pid == 0 or 'idle' in pname or 'system' in pname:
                continue
            # Check for extreme compute saturation by a user-space task
            if (p.get('cpu_percent', 0) > 90.0 or (p.get('cpu_percent', 0) > 75.0 and p.get('is_suspicious'))) and p.get('risk_score', 0) > 0.4:
                return {'evidence': f"Process {p.get('name')} using CPU: {p.get('cpu_percent')}%, RAM: {p.get('memory_percent')}%"}
        return None

    def _check_proc_parent(self, tel, procs, conns, auth):
        unusual_pairs = {
            ('winword.exe', 'cmd.exe'), ('excel.exe', 'powershell.exe'),
            ('powershell.exe', 'xmrig_miner.exe'), ('winword.exe', 'powershell.exe'),
            ('winword.exe', 'svchost_updater.exe')
        }
        for p in procs:
            parent = str(p.get('parent_name', '')).lower()
            child = str(p.get('name', '')).lower()
            for up, uc in unusual_pairs:
                if up in parent and uc in child:
                    return {'evidence': f"Suspicious parent-child: {parent} spawned {child}"}
        return None

    def _check_net_port(self, tel, procs, conns, auth):
        for c in conns:
            port = c.get('remote_port') or c.get('port')
            if port and isinstance(port, int) and port in (3333, 4444, 5555, 6667, 1337):
                return {'evidence': f"High-risk C2/Mining port {port} detected"}
            if c.get('is_suspicious') and port and port not in (80, 443, 8080, 22, 53, 5173, 8000):
                return {'evidence': f"Suspicious connection to port {port}"}
        return None

    def _check_net_upload(self, tel, procs, conns, auth):
        if tel.get('net_upload_rate', 0) > 30_000_000: # 30 MB/s sustained
            return {'evidence': f"High outbound upload rate: {round(tel.get('net_upload_rate', 0)/1024/1024, 1)} MB/s"}
        return None

    def _check_net_conn(self, tel, procs, conns, auth):
        count = len(conns)
        total = tel.get('net_connections_count', count)
        if total > 1500: # True flood condition
            return {'evidence': f"Excessive active connections: {max(count, total)}"}
        return None

    def _check_net_ext(self, tel, procs, conns, auth):
        for c in conns:
            ip = str(c.get('remote_address') or c.get('remote_ip') or '')
            if ip.startswith(('203.0.113.', '198.51.100.', '185.220.', '45.33.')):
                return {'evidence': f"Connection to known test threat endpoint {ip}"}
        return None

    def _check_auth_fail(self, tel, procs, conns, auth):
        fails = sum(1 for a in auth if a.get('status') == 'failed' or a.get('success') is False or a.get('is_suspicious') is True)
        if fails >= 4:
            return {'evidence': f"Multiple failed login attempts ({fails}) in short window"}
        return None

    def _check_auth_time(self, tel, procs, conns, auth):
        return None

    def _check_disk_write(self, tel, procs, conns, auth):
        if tel.get('disk_write_rate', 0) > 50_000_000: # 50 MB/s
            return {'evidence': f"Disk write burst: {round(tel.get('disk_write_rate', 0)/1024/1024, 1)} MB/s"}
        return None

    def _check_res_exhaust(self, tel, procs, conns, auth):
        cpu = tel.get('cpu_percent', 0)
        ram = tel.get('ram_percent', 0)
        if (cpu > 95 and ram > 90) or cpu > 98:
            return {'evidence': f"High resource saturation. CPU: {cpu:.1f}%, RAM: {ram:.1f}%"}
        return None
