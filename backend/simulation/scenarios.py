from typing import Dict, Any, List
from datetime import datetime, timezone
import math
import random


def _osc(base: float, amp: float, t: float, freq: float = 0.15, noise: float = 1.5) -> float:
    """Oscillate around base value with given amplitude and frequency.
    
    Creates realistic fluctuating simulation values instead of static ceilings.
    freq: cycles per second (Hz). noise: random jitter ±noise.
    """
    return round(base + amp * math.sin(t * freq * 2 * math.pi) + random.uniform(-noise, noise), 1)


def _osc_int(base: int, amp: int, t: float, freq: float = 0.12, noise: int = 30) -> int:
    """Integer version of _osc for connection counts etc."""
    return max(0, int(base + amp * math.sin(t * freq * 2 * math.pi) + random.randint(-noise, noise)))


class BaseScenario:
    def __init__(self, parameters: Dict[str, Any]):
        self.parameters = parameters or {}

    def get_simulated_values(self, elapsed_seconds: float) -> Dict[str, Any]:
        return {}


class CryptominingScenario(BaseScenario):
    """Scenario 1: Cryptomining - 95%+ CPU, high thermal, stratum mining socket, temp miner binary."""
    def get_simulated_values(self, elapsed_seconds: float) -> Dict[str, Any]:
        # Ramp up first 5s, then oscillate realistically
        ramp = min(1.0, elapsed_seconds / 5.0)
        t = elapsed_seconds

        cpu_val = _osc(93.0 * ramp + 65.0 * (1 - ramp), 4.0, t, freq=0.11) if ramp >= 1.0 else round(65.0 + (28.0 * ramp), 1)
        cpu_val = max(60.0, min(99.0, cpu_val))
        ram_val = _osc(72.0, 3.0, t, freq=0.07) if ramp >= 1.0 else round(45.0 + (27.0 * ramp), 1)
        ram_val = max(40.0, min(95.0, ram_val))
        temp_val = _osc(87.0, 4.0, t, freq=0.08, noise=1.0) if ramp >= 1.0 else round(65.0 + (22.0 * ramp), 1)
        temp_val = max(60.0, min(98.0, temp_val))

        return {
            'cpu_percent': cpu_val,
            'cpu': {'cpu_percent': cpu_val, 'total_usage': cpu_val, 'core_usage': [min(100, cpu_val + random.uniform(-5, 5)) for _ in range(8)]},
            'ram_percent': ram_val,
            'cpu_temp': temp_val,
            'temperature': {'cpu_temp': temp_val, 'temp_source': 'simulated'},
            'ml_anomaly_score': _osc(0.95, 0.03, t, freq=0.05, noise=0.01),
            'ml_explanation': 'Extreme compute saturation & Stratum protocol clustering detected',
            'ml_models': {
                'isolation_forest': _osc(0.97, 0.02, t, freq=0.06, noise=0.01),
                'one_class_svm': _osc(0.93, 0.02, t, freq=0.09, noise=0.01),
                'autoencoder': _osc(0.95, 0.02, t, freq=0.07, noise=0.01),
                'kmeans': {'score': _osc(0.94, 0.03, t, freq=0.08, noise=0.01), 'cluster_id': 3, 'cluster_label': 'Compute Exhaustion / Mining'}
            },
            'process_simulation': {
                'pid': 8844,
                'name': 'xmrig_miner.exe',
                'parent_name': 'powershell.exe',
                'ppid': 4120,
                'cpu_percent': max(0, cpu_val - random.uniform(1, 4)),
                'memory_percent': _osc(35.0, 3.0, t, freq=0.06, noise=0.5),
                'memory_rss': 512 * 1024 * 1024,
                'exe_path': 'C:\\Users\\User\\AppData\\Local\\Temp\\xmrig_miner.exe',
                'cmdline_str': 'C:\\Users\\User\\AppData\\Local\\Temp\\xmrig_miner.exe --donate-level 1 -o stratum+tcp://203.0.113.100:3333 -u test_wallet',
                'username': 'NT AUTHORITY\\SYSTEM',
                'status': 'running',
                'is_suspicious': True,
                'anomaly_score': 0.95,
                'risk_score': 0.95,
                'risk_explanation': 'High-compute cryptominer execution from Temp directory targeting Stratum mining pool'
            },
            'network_simulation': [
                {
                    'pid': 8844,
                    'process_name': 'xmrig_miner.exe (8844)',
                    'local_address': '192.168.1.105',
                    'local_port': 49152,
                    'remote_address': '203.0.113.100',
                    'remote_port': 3333,
                    'protocol': 'TCP',
                    'status': 'ESTABLISHED',
                    'is_suspicious': True,
                    'anomaly_score': 0.95,
                    'risk_score': 0.95,
                    'threat_intel_status': 'Known Malicious Stratum Mining Pool'
                }
            ]
        }


class NetworkFloodScenario(BaseScenario):
    """Scenario 2: Network Flood / DDoS - massive traffic surge, socket storm."""
    def get_simulated_values(self, elapsed_seconds: float) -> Dict[str, Any]:
        ramp = min(1.0, elapsed_seconds / 5.0)
        t = elapsed_seconds

        sock_count = _osc_int(2800, 600, t, freq=0.12, noise=80) if ramp >= 1.0 else int(800 + (2000 * ramp))
        sock_count = max(500, sock_count)
        down_rate = _osc(155_000_000, 35_000_000, t, freq=0.09, noise=2_000_000) if ramp >= 1.0 else round(25_000_000 + (130_000_000 * ramp), 1)
        down_rate = max(10_000_000, down_rate)
        up_rate = _osc(100_000_000, 20_000_000, t, freq=0.11, noise=1_500_000) if ramp >= 1.0 else round(15_000_000 + (85_000_000 * ramp), 1)
        up_rate = max(5_000_000, up_rate)
        cpu_val = _osc(82.0, 8.0, t, freq=0.13) if ramp >= 1.0 else round(60.0 + (22.0 * ramp), 1)
        cpu_val = max(50.0, min(99.0, cpu_val))

        return {
            'cpu_percent': cpu_val,
            'net_connections_count': sock_count,
            'net_download_rate': down_rate,
            'net_upload_rate': up_rate,
            'network': {
                'download_rate': down_rate,
                'upload_rate': up_rate,
                'net_download_rate': down_rate,
                'net_upload_rate': up_rate,
                'connection_count': sock_count,
                'net_connections_count': sock_count
            },
            'ml_anomaly_score': _osc(0.97, 0.02, t, freq=0.05, noise=0.01),
            'ml_explanation': 'Volumetric socket surge and network buffer saturation',
            'ml_models': {
                'isolation_forest': _osc(0.98, 0.01, t, freq=0.06, noise=0.005),
                'one_class_svm': _osc(0.96, 0.02, t, freq=0.09, noise=0.01),
                'autoencoder': _osc(0.97, 0.02, t, freq=0.07, noise=0.01),
                'kmeans': {'score': _osc(0.97, 0.02, t, freq=0.08, noise=0.01), 'cluster_id': 4, 'cluster_label': 'Volumetric Flooding Storm'}
            },
            'process_simulation': {
                'pid': 9912,
                'name': 'flood_daemon.exe',
                'parent_name': 'cmd.exe',
                'ppid': 3312,
                'cpu_percent': _osc(75.0, 8.0, t, freq=0.14, noise=2.0),
                'memory_percent': _osc(28.0, 4.0, t, freq=0.08, noise=1.0),
                'exe_path': 'C:\\Users\\User\\AppData\\Local\\Temp\\flood_daemon.exe',
                'username': 'System',
                'status': 'running',
                'is_suspicious': True,
                'anomaly_score': 0.95,
                'risk_score': 0.95,
                'risk_explanation': 'Rapid socket saturation and volumetric packet flooding engine'
            },
            'network_simulation': [
                {
                    'pid': 9912,
                    'process_name': 'flood_daemon.exe (9912)',
                    'local_address': '192.168.1.105',
                    'local_port': 50000 + i,
                    'remote_address': '198.51.100.200',
                    'remote_port': 80 + i,
                    'protocol': 'TCP',
                    'status': 'SYN_SENT',
                    'is_suspicious': True,
                    'anomaly_score': 0.95,
                    'risk_score': 0.95,
                    'threat_intel_status': 'DDoS Flooding Target'
                }
                for i in range(5)
            ]
        }


class BruteForceScenario(BaseScenario):
    """Scenario 3: Brute Force Authentication - Multiple rapid failed Kerberos/NTLM/SSH logons with wave fluctuations."""
    def get_simulated_values(self, elapsed_seconds: float) -> Dict[str, Any]:
        t = elapsed_seconds
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        target_accounts = ['administrator', 'root', 'admin', 'service_account', 'finance_admin', 'backup_user', 'domain_admin', 'sec_auditor', 'db_admin']
        
        # Burst velocity variation (5 to 9 concurrent sprayed accounts based on wave)
        count = max(4, min(len(target_accounts), 5 + int(math.sin(t * 0.3) * 3 + random.randint(0, 1))))
        selected_accounts = target_accounts[:count]

        events = [
            {
                'timestamp': now_str,
                'event_type': 'Logon Failure (Unauthorized Credential Spraying)',
                'username': acc,
                'source': f'198.51.100.{40 + (i % 5)} (Remote SSH/RDP/Kerberos)',
                'success': False,
                'status': 'failed',
                'method': 'Kerberos / NTLM / SSH',
                'is_suspicious': True
            }
            for i, acc in enumerate(selected_accounts)
        ]
        
        cpu_val = _osc(72.0, 7.0, t, freq=0.15)
        return {
            'auth_events': events,
            'cpu_percent': cpu_val,
            'process_creation_rate': _osc(50.0, 15.0, t, freq=0.2),
            'ml_anomaly_score': _osc(0.95, 0.02, t, freq=0.05, noise=0.01),
            'ml_explanation': 'Anomalous logon frequency and credential spray signature',
            'ml_models': {
                'isolation_forest': _osc(0.94, 0.02, t, freq=0.06, noise=0.01),
                'one_class_svm': _osc(0.96, 0.01, t, freq=0.08, noise=0.01),
                'autoencoder': _osc(0.93, 0.02, t, freq=0.07, noise=0.01),
                'kmeans': {'score': _osc(0.95, 0.02, t, freq=0.09, noise=0.01), 'cluster_id': 2, 'cluster_label': 'Auth Anomaly / Credential Spray'}
            },
            'process_simulation': {
                'pid': 7210,
                'name': 'hydra_brute.exe',
                'parent_name': 'powershell.exe',
                'ppid': 2208,
                'cpu_percent': _osc(68.0, 8.0, t, freq=0.14, noise=2.0),
                'memory_percent': _osc(18.0, 3.0, t, freq=0.08, noise=0.5),
                'exe_path': 'C:\\Users\\User\\AppData\\Local\\Temp\\hydra_brute.exe',
                'username': 'System',
                'status': 'running',
                'is_suspicious': True,
                'anomaly_score': 0.95,
                'risk_score': 0.95,
                'risk_explanation': 'Automated high-velocity dictionary password spraying against host'
            },
            'network_simulation': [
                {
                    'pid': 7210,
                    'process_name': 'hydra_brute.exe (7210)',
                    'local_address': '192.168.1.105',
                    'local_port': 22,
                    'remote_address': '198.51.100.42',
                    'remote_port': 44321,
                    'protocol': 'TCP',
                    'status': 'ESTABLISHED',
                    'is_suspicious': True,
                    'anomaly_score': 0.95,
                    'risk_score': 0.95,
                    'threat_intel_status': 'Brute Force Attacker IP'
                }
            ]
        }


class MalwareScenario(BaseScenario):
    """Scenario 4: Multi-Vector Malware - Trojanized process spawned by Word, C2 beaconing on port 4444."""
    def get_simulated_values(self, elapsed_seconds: float) -> Dict[str, Any]:
        ramp = min(1.0, elapsed_seconds / 5.0)
        t = elapsed_seconds
        
        cpu_val = _osc(91.0, 5.0, t, freq=0.10) if ramp >= 1.0 else round(65.0 + (26.0 * ramp), 1)
        ram_val = _osc(85.0, 4.0, t, freq=0.06) if ramp >= 1.0 else round(60.0 + (25.0 * ramp), 1)
        write_rate = _osc(85_000_000, 20_000_000, t, freq=0.12, noise=1_000_000) if ramp >= 1.0 else round(30_000_000 + (55_000_000 * ramp), 1)
        up_rate = _osc(60_000_000, 15_000_000, t, freq=0.08, noise=1_000_000) if ramp >= 1.0 else round(20_000_000 + (40_000_000 * ramp), 1)

        return {
            'cpu_percent': cpu_val,
            'cpu': {'cpu_percent': cpu_val, 'total_usage': cpu_val},
            'ram_percent': ram_val,
            'memory': {'ram_percent': ram_val},
            'disk_write_rate': write_rate,
            'net_upload_rate': up_rate,
            'ml_anomaly_score': _osc(0.99, 0.01, t, freq=0.05, noise=0.005),
            'ml_explanation': 'Multi-vector anomaly: Trojan hierarchy, abnormal C2 port & resource surge',
            'ml_models': {
                'isolation_forest': _osc(0.99, 0.01, t, freq=0.06, noise=0.005),
                'one_class_svm': _osc(0.98, 0.01, t, freq=0.07, noise=0.005),
                'autoencoder': _osc(0.99, 0.01, t, freq=0.08, noise=0.005),
                'kmeans': {'score': _osc(0.99, 0.01, t, freq=0.09, noise=0.005), 'cluster_id': 5, 'cluster_label': 'Multi-Vector Trojan C2'}
            },
            'process_simulation': {
                'pid': 6640,
                'name': 'svchost_updater.exe',
                'parent_name': 'winword.exe',
                'ppid': 1920,
                'cpu_percent': _osc(82.0, 7.0, t, freq=0.13, noise=1.5),
                'memory_percent': _osc(42.0, 3.0, t, freq=0.07, noise=0.8),
                'exe_path': 'C:\\Users\\User\\AppData\\Local\\Temp\\svchost_updater.exe',
                'username': 'NT AUTHORITY\\SYSTEM',
                'status': 'running',
                'is_suspicious': True,
                'anomaly_score': 0.98,
                'risk_score': 0.98,
                'risk_explanation': 'Malicious trojan execution masquerading as svchost spawned by Office document'
            },
            'network_simulation': [
                {
                    'pid': 6640,
                    'process_name': 'svchost_updater.exe (6640)',
                    'local_address': '192.168.1.105',
                    'local_port': 51234,
                    'remote_address': '203.0.113.100',
                    'remote_port': 4444,
                    'protocol': 'TCP',
                    'status': 'ESTABLISHED',
                    'is_suspicious': True,
                    'anomaly_score': 0.98,
                    'risk_score': 0.98,
                    'threat_intel_status': 'Confirmed Malicious C2 Beacon'
                }
            ]
        }


class DataExfiltrationScenario(BaseScenario):
    """Scenario 5: Data Exfiltration - High-bandwidth sustained upload bursts to external unlisted IP."""
    def get_simulated_values(self, elapsed_seconds: float) -> Dict[str, Any]:
        ramp = min(1.0, elapsed_seconds / 5.0)
        t = elapsed_seconds

        up_rate = _osc(145_000_000, 30_000_000, t, freq=0.10, noise=2_000_000) if ramp >= 1.0 else round(45_000_000 + (100_000_000 * ramp), 1)
        read_rate = _osc(110_000_000, 25_000_000, t, freq=0.12, noise=1_500_000) if ramp >= 1.0 else round(35_000_000 + (75_000_000 * ramp), 1)
        cpu_val = _osc(80.0, 7.0, t, freq=0.11) if ramp >= 1.0 else round(55.0 + (25.0 * ramp), 1)

        return {
            'cpu_percent': cpu_val,
            'net_upload_rate': up_rate,
            'disk_read_rate': read_rate,
            'network': {
                'upload_rate': up_rate,
                'net_upload_rate': up_rate,
                'download_rate': 2_500_000,
                'net_download_rate': 2_500_000
            },
            'ml_anomaly_score': _osc(0.97, 0.02, t, freq=0.05, noise=0.01),
            'ml_explanation': 'High-volume outbound bandwidth anomaly and unlisted IP exfiltration',
            'ml_models': {
                'isolation_forest': _osc(0.96, 0.02, t, freq=0.06, noise=0.01),
                'one_class_svm': _osc(0.98, 0.01, t, freq=0.08, noise=0.005),
                'autoencoder': _osc(0.97, 0.02, t, freq=0.07, noise=0.01),
                'kmeans': {'score': _osc(0.96, 0.02, t, freq=0.09, noise=0.01), 'cluster_id': 6, 'cluster_label': 'High-Bandwidth Exfiltration'}
            },
            'process_simulation': {
                'pid': 5520,
                'name': 'data_packager.exe',
                'parent_name': 'cmd.exe',
                'ppid': 2880,
                'cpu_percent': _osc(76.0, 6.0, t, freq=0.13, noise=1.5),
                'memory_percent': _osc(38.0, 3.0, t, freq=0.07, noise=0.6),
                'exe_path': 'C:\\Users\\User\\AppData\\Local\\Temp\\data_packager.exe',
                'username': 'System',
                'status': 'running',
                'is_suspicious': True,
                'anomaly_score': 0.96,
                'risk_score': 0.96,
                'risk_explanation': 'Unauthorized bulk file compression and exfiltration stream'
            },
            'network_simulation': [
                {
                    'pid': 5520,
                    'process_name': 'data_packager.exe (5520)',
                    'local_address': '192.168.1.105',
                    'local_port': 58900,
                    'remote_address': '198.51.100.200',
                    'remote_port': 443,
                    'protocol': 'TCP',
                    'status': 'ESTABLISHED',
                    'is_suspicious': True,
                    'anomaly_score': 0.96,
                    'risk_score': 0.96,
                    'threat_intel_status': 'Target Exfiltration Server'
                }
            ]
        }


class RansomwareScenario(BaseScenario):
    """Scenario 6: Ransomware Activity - Massive disk write bursts, rapid encryption signature."""
    def get_simulated_values(self, elapsed_seconds: float) -> Dict[str, Any]:
        ramp = min(1.0, elapsed_seconds / 5.0)
        t = elapsed_seconds

        write_rate = _osc(420_000_000, 70_000_000, t, freq=0.14, noise=5_000_000) if ramp >= 1.0 else round(150_000_000 + (270_000_000 * ramp), 1)
        cpu_val = _osc(92.0, 5.0, t, freq=0.10) if ramp >= 1.0 else round(60.0 + (32.0 * ramp), 1)
        ram_val = _osc(84.0, 4.0, t, freq=0.06) if ramp >= 1.0 else round(50.0 + (34.0 * ramp), 1)

        return {
            'disk_write_rate': write_rate,
            'cpu_percent': cpu_val,
            'cpu': {'cpu_percent': cpu_val, 'total_usage': cpu_val},
            'ram_percent': ram_val,
            'memory': {'ram_percent': ram_val},
            'ml_anomaly_score': _osc(0.99, 0.01, t, freq=0.05, noise=0.005),
            'ml_explanation': 'High-frequency sequential disk encryption & ransomware heuristic match',
            'ml_models': {
                'isolation_forest': _osc(0.99, 0.01, t, freq=0.06, noise=0.005),
                'one_class_svm': _osc(0.99, 0.01, t, freq=0.07, noise=0.005),
                'autoencoder': _osc(0.99, 0.01, t, freq=0.08, noise=0.005),
                'kmeans': {'score': _osc(0.99, 0.01, t, freq=0.09, noise=0.005), 'cluster_id': 7, 'cluster_label': 'Rapid Encryption Burst'}
            },
            'process_simulation': {
                'pid': 4490,
                'name': 'vssadmin_encrypt.exe',
                'parent_name': 'powershell.exe',
                'ppid': 1140,
                'cpu_percent': _osc(86.0, 6.0, t, freq=0.13, noise=1.5),
                'memory_percent': _osc(48.0, 3.0, t, freq=0.07, noise=0.8),
                'exe_path': 'C:\\Users\\User\\AppData\\Local\\Temp\\vssadmin_encrypt.exe',
                'username': 'NT AUTHORITY\\SYSTEM',
                'status': 'running',
                'is_suspicious': True,
                'anomaly_score': 0.99,
                'risk_score': 0.99,
                'risk_explanation': 'High-frequency mass disk write and shadow copy deletion (Ransomware signature)'
            },
            'network_simulation': [
                {
                    'pid': 4490,
                    'process_name': 'vssadmin_encrypt.exe (4490)',
                    'local_address': '192.168.1.105',
                    'local_port': 54321,
                    'remote_address': '203.0.113.100',
                    'remote_port': 8080,
                    'protocol': 'TCP',
                    'status': 'ESTABLISHED',
                    'is_suspicious': True,
                    'anomaly_score': 0.98,
                    'risk_score': 0.98,
                    'threat_intel_status': 'Ransomware C2 Key Exchange'
                }
            ]
        }


class CustomScenario(BaseScenario):
    def get_simulated_values(self, elapsed_seconds: float) -> Dict[str, Any]:
        result = {}
        t = elapsed_seconds
        for k, v in self.parameters.items():
            if isinstance(v, (int, float)):
                result[k] = _osc(float(v), float(v) * 0.05, t)
            else:
                result[k] = v
        result['ml_anomaly_score'] = _osc(0.90, 0.03, t, freq=0.06)
        result['ml_explanation'] = 'Custom test scenario anomaly parameters'
        result['ml_models'] = {
            'isolation_forest': _osc(0.90, 0.02, t),
            'one_class_svm': _osc(0.90, 0.02, t),
            'autoencoder': _osc(0.90, 0.02, t),
            'kmeans': {'score': _osc(0.90, 0.02, t), 'cluster_id': 8, 'cluster_label': 'Custom Simulation Workload'}
        }
        return result

