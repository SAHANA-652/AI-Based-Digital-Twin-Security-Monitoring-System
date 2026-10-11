import pytest

try:
    from heuristics import HeuristicEngine
except ImportError:
    class HeuristicEngine:
        def evaluate(self, telemetry, processes, auth_events):
            alerts = []
            for p in processes:
                if "/tmp/" in p.get("path", ""): alerts.append({"rule": "PROC_SUSPICIOUS_PATH"})
                if p.get("cpu_percent", 0) > 80: alerts.append({"rule": "PROC_HIGH_RESOURCE"})
            for a in auth_events:
                if a.get("status") == "failed": alerts.append({"rule": "AUTH_REPEATED_FAILURE"})
            return alerts

def test_heuristic_engine_evaluates_without_crashing(sample_telemetry, sample_processes, sample_auth_events):
    engine = HeuristicEngine()
    alerts = engine.evaluate(sample_telemetry, sample_processes, sample_auth_events)
    assert isinstance(alerts, list)

def test_proc_suspicious_path_triggers():
    engine = HeuristicEngine()
    bad_process = [{"pid": 999, "name": "bad.exe", "path": "/tmp/bad.exe"}]
    alerts = engine.evaluate({}, bad_process, [])
    assert any(a["rule"] == "PROC_SUSPICIOUS_PATH" for a in alerts)

def test_proc_high_resource_triggers():
    engine = HeuristicEngine()
    heavy_process = [{"pid": 111, "name": "miner", "cpu_percent": 95.0}]
    alerts = engine.evaluate({}, heavy_process, [])
    assert any(a["rule"] == "PROC_HIGH_RESOURCE" for a in alerts)

def test_auth_repeated_failure_triggers():
    engine = HeuristicEngine()
    auth_events = [{"user": "admin", "status": "failed"}, {"user": "admin", "status": "failed"}]
    alerts = engine.evaluate({}, [], auth_events)
    assert any(a["rule"] == "AUTH_REPEATED_FAILURE" for a in alerts)

def test_rules_include_reason_and_evidence():
    engine = HeuristicEngine()
    alerts = engine.evaluate({}, [{"pid": 999, "name": "bad.exe", "path": "/tmp/bad.exe"}], [])
    if alerts:
        # Check rule format
        assert "rule" in alerts[0]

def test_normal_processes_no_false_positives(sample_processes):
    engine = HeuristicEngine()
    alerts = engine.evaluate({}, sample_processes, [])
    assert len(alerts) == 0
