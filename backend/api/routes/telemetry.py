import asyncio
from fastapi import APIRouter
from services.monitoring_service import monitoring_service
from database.connection import get_db
from database.models import Telemetry
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
import platform
import psutil

router = APIRouter(tags=["telemetry"])


@router.get("/telemetry")
@router.get("/telemetry/current")
async def get_current_telemetry() -> Dict[str, Any]:
    return monitoring_service.get_telemetry_snapshot()


@router.get("/telemetry/health")
async def get_telemetry_health() -> Dict[str, Any]:
    return monitoring_service.get_monitoring_state_snapshot()


def _get_telemetry_history_sync(limit: int, hours: Optional[int]) -> List[Dict[str, Any]]:
    with get_db() as db:
        query = db.query(Telemetry)
        if hours:
            since = datetime.now(timezone.utc) - timedelta(hours=hours)
            query = query.filter(Telemetry.timestamp >= since)
            
        rows = query.order_by(Telemetry.timestamp.desc()).limit(limit).all()
        return [
            {
                "id": r.id,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "cpu_percent": r.cpu_percent,
                "ram_percent": r.ram_percent,
                "disk_read_rate": r.disk_read_rate,
                "disk_write_rate": r.disk_write_rate,
                "net_upload_rate": r.net_upload_rate,
                "net_download_rate": r.net_download_rate,
                "process_count": r.process_count,
                "cpu_temp": r.cpu_temp,
                "battery_percent": r.battery_percent,
                "is_simulation": r.is_simulation
            }
            for r in rows
        ]


@router.get("/telemetry/history")
async def get_telemetry_history(limit: int = 200, hours: Optional[int] = None) -> List[Dict[str, Any]]:
    return await asyncio.to_thread(_get_telemetry_history_sync, limit, hours)


@router.get("/system/info")
async def get_system_info() -> Dict[str, Any]:
    tel = monitoring_service.get_telemetry_snapshot()
    sys_info = tel.get("system_info", {}) if isinstance(tel, dict) else {}
    ram_total = tel.get("ram_total") or (sys_info.get("total_ram_gb", 0) * (1024**3))
    if not ram_total:
        try:
            ram_total = psutil.virtual_memory().total
        except Exception:
            ram_total = 16 * (1024**3)

    return {
        "hostname": sys_info.get("hostname", platform.node()),
        "os_name": sys_info.get("os_name", platform.system()),
        "os_version": sys_info.get("os_version", platform.version()),
        "architecture": sys_info.get("architecture", platform.machine()),
        "cpu_model": sys_info.get("cpu_model", platform.processor() or "Multi-Core CPU"),
        "cpu_cores_physical": sys_info.get("cpu_cores", 4),
        "cpu_cores_logical": sys_info.get("cpu_threads", 8),
        "total_ram_gb": round(ram_total / (1024**3), 2),
        "uptime": sys_info.get("uptime_seconds", sys_info.get("uptime", tel.get("uptime_seconds", 0)))
    }
