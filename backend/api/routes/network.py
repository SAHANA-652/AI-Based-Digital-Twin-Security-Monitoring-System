from fastapi import APIRouter
from services.monitoring_service import monitoring_service
from database.connection import get_db
from database.models import Telemetry
from typing import List, Dict, Any

router = APIRouter(prefix="/network", tags=["network"])


@router.get("/connections")
async def get_connections() -> List[Dict[str, Any]]:
    network = monitoring_service.get_network_snapshot()
    return network.get("connections", []) if isinstance(network, dict) else []


@router.get("/stats")
async def get_network_stats() -> Dict[str, Any]:
    network = monitoring_service.get_network_snapshot()
    if isinstance(network, dict) and network.get("stats"):
        return network["stats"]
    tel = monitoring_service.get_telemetry_snapshot()
    return {
        "upload_rate": tel.get("net_upload_rate", 0.0),
        "download_rate": tel.get("net_download_rate", 0.0),
        "connection_count": tel.get("net_connections_count", 0),
        "net_upload_rate": tel.get("net_upload_rate", 0.0),
        "net_download_rate": tel.get("net_download_rate", 0.0),
        "net_connections_count": tel.get("net_connections_count", 0)
    }


def _get_network_history_sync(limit: int) -> List[Dict[str, Any]]:
    with get_db() as db:
        rows = db.query(Telemetry).order_by(Telemetry.timestamp.desc()).limit(limit).all()
        return [
            {
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "net_upload_rate": r.net_upload_rate,
                "net_download_rate": r.net_download_rate,
                "net_connections_count": r.net_connections_count,
                "is_simulation": r.is_simulation
            }
            for r in rows
        ]


@router.get("/history")
async def get_network_history(limit: int = 60) -> List[Dict[str, Any]]:
    import asyncio
    return await asyncio.to_thread(_get_network_history_sync, limit)
