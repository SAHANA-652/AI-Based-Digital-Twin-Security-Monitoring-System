import platform
import psutil
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from database.connection import get_db
from database.models import Telemetry, RiskScore, Alert, Incident


class ReportService:
    def generate_report(self, hours: int = 24, title: str = "Digital Twin Security & Audit Report") -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        since = now - timedelta(hours=hours)
        
        # 1. Query Database Records and extract scalar attributes inside the session context
        with get_db() as db:
            raw_telemetry = db.query(Telemetry).filter(Telemetry.timestamp >= since).order_by(Telemetry.timestamp.desc()).limit(200).all()
            telemetry_records = [
                {
                    "cpu_percent": r.cpu_percent,
                    "ram_percent": r.ram_percent,
                    "is_simulation": r.is_simulation
                }
                for r in raw_telemetry
            ]
            
            raw_risk = db.query(RiskScore).filter(RiskScore.timestamp >= since).order_by(RiskScore.timestamp.desc()).limit(200).all()
            risk_records = [
                {
                    "overall_score": r.overall_score,
                    "risk_level": r.risk_level,
                    "classification": r.classification,
                    "is_simulation": r.is_simulation
                }
                for r in raw_risk
            ]
            
            raw_alerts = db.query(Alert).filter(Alert.timestamp >= since).order_by(Alert.timestamp.desc()).limit(50).all()
            alerts_data = [
                {
                    "id": a.id,
                    "title": a.title,
                    "severity": a.severity,
                    "risk_score": a.risk_score,
                    "timestamp": a.timestamp.isoformat() if a.timestamp else None,
                    "status": a.status
                }
                for a in raw_alerts
            ]
            
        # 2. Check if simulation data is present
        has_sim_telemetry = any(r.get("is_simulation") for r in telemetry_records)
        has_sim_risk = any(r.get("is_simulation") for r in risk_records)
        is_simulation = has_sim_telemetry or has_sim_risk
        
        # 3. Calculate Telemetry Aggregates
        from services.monitoring_service import monitoring_service
        cur_tel = monitoring_service.get_telemetry_snapshot()
        sys_info = cur_tel.get("system_info", {}) or {}

        cur_cpu = cur_tel.get("cpu_percent", 0.0)
        cur_ram = cur_tel.get("ram_percent", 0.0)

        avg_cpu = sum(r["cpu_percent"] for r in telemetry_records) / len(telemetry_records) if telemetry_records else cur_cpu
        max_cpu = max((r["cpu_percent"] for r in telemetry_records), default=cur_cpu)
        avg_ram = sum(r["ram_percent"] for r in telemetry_records) / len(telemetry_records) if telemetry_records else cur_ram
        max_ram = max((r["ram_percent"] for r in telemetry_records), default=cur_ram)
        
        # Battery state from snapshot
        batt_data = cur_tel.get("battery", {}) or {}
        batt_pct = batt_data.get("percent") if isinstance(batt_data, dict) else cur_tel.get("battery_percent")
        batt_plugged = batt_data.get("power_plugged") if isinstance(batt_data, dict) else None
        batt_str = f"{batt_pct}% ({'Plugged In' if batt_plugged else 'On Battery'})" if batt_pct is not None else "Not applicable (Desktop)"
        
        # 4. Risk Summary
        latest_risk = risk_records[0] if risk_records else None
        max_risk_score = max((r["overall_score"] for r in risk_records), default=0)
        avg_risk_score = sum(r["overall_score"] for r in risk_records) / len(risk_records) if risk_records else 0
        
        # 5. Top Processes from background cache
        procs = monitoring_service.get_processes_snapshot()

        # 6. Active Network Sockets from background cache
        net_snapshot = monitoring_service.get_network_snapshot()
        sockets_count = net_snapshot.get("stats", {}).get("connection_count") or len(net_snapshot.get("connections", [])) or cur_tel.get("net_connections_count", 0)

        # 7. Actionable Recommendations
        recommendations = [
            "Maintain continuous Digital Twin telemetry baseline synchronization across normal host work cycles.",
            "Verify remote destination IP addresses against Threat Intelligence before whitelisting long-lived sockets.",
            "Periodically review elevated background processes in Process Monitor to prevent unauthorized compute consumption.",
            "Ensure regular system backups and verify principle of least privilege for user accounts."
        ]

        if max_risk_score > 60:
            recommendations.insert(0, "URGENT: Review recorded alert events with high severity scores and inspect affected PID command lines.")

        period_str = f"Past {hours // 24} Days" if (hours >= 24 and hours % 24 == 0) else f"Past {hours} Hours"

        return {
            "report_id": f"REP-{int(now.timestamp())}",
            "title": title,
            "monitoring_period": f"{period_str} ({since.strftime('%Y-%m-%d %H:%M')} to {now.strftime('%Y-%m-%d %H:%M')} UTC)",
            "generated_at": now.isoformat(),
            "data_classification": "SIMULATED TELEMETRY" if is_simulation else "REAL TELEMETRY",
            "is_simulation": is_simulation,
            "system_info": {
                "hostname": sys_info.get("hostname", platform.node()),
                "os_name": sys_info.get("os_name", f"{platform.system()} {platform.release()}"),
                "architecture": sys_info.get("architecture", platform.machine()),
                "cpu_model": sys_info.get("cpu_model", platform.processor() or "Multi-Core Processor"),
                "cpu_cores": f"{sys_info.get('cpu_cores', 4)} physical / {sys_info.get('cpu_threads', 8)} logical",
                "total_ram_gb": round((cur_tel.get('ram_total') or 16 * (1024**3)) / (1024**3), 2),
                "battery_status": batt_str
            },
            "risk_summary": {
                "current_score": latest_risk["overall_score"] if latest_risk else 0,
                "current_level": latest_risk["risk_level"] if latest_risk else "Normal",
                "average_score": round(avg_risk_score, 1),
                "peak_score": max_risk_score,
                "classification": latest_risk["classification"] if latest_risk else "Normal Host Operation",
                "explanation": "Calculated via multi-signal evidence correlator fusing ML anomalies and heuristic baseline deviations."
            },
            "telemetry_summary": {
                "average_cpu_percent": round(avg_cpu, 1),
                "peak_cpu_percent": round(max_cpu, 1),
                "average_ram_percent": round(avg_ram, 1),
                "peak_ram_percent": round(max_ram, 1),
                "total_active_processes": len(procs),
                "total_active_sockets": sockets_count,
                "sample_count": len(telemetry_records)
            },
            "alerts_summary": {
                "total_alerts": len(alerts_data),
                "alerts": alerts_data[:10]
            },
            "top_processes": [
                {
                    "pid": p.get("pid"),
                    "name": p.get("name"),
                    "cpu_percent": p.get("cpu_percent", 0),
                    "memory_percent": round(p.get("memory_percent", 0), 2),
                    "username": p.get("username"),
                    "status": p.get("status")
                }
                for p in procs[:8]
            ],
            "recommendations": recommendations
        }


report_service = ReportService()
