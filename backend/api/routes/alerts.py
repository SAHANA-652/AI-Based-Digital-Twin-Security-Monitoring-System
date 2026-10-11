import asyncio
from fastapi import APIRouter, HTTPException
from services.alert_service import alert_service
from database.connection import get_db
from database.models import Alert
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

router = APIRouter(prefix="/alerts", tags=["alerts"])


class AlertStatusUpdate(BaseModel):
    status: str
    resolved_by: Optional[str] = "admin"
    notes: Optional[str] = None


def _get_alerts_sync(status_filter: Optional[str], limit: int) -> List[Dict[str, Any]]:
    with get_db() as db:
        query = db.query(Alert)
        if status_filter:
            query = query.filter(Alert.status == status_filter)
        rows = query.order_by(Alert.timestamp.desc()).limit(limit).all()
        return [
            {
                "id": r.id,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "severity": r.severity,
                "risk_score": r.risk_score,
                "title": r.title,
                "description": r.description,
                "evidence": r.evidence,
                "affected_pid": r.affected_pid,
                "affected_process": r.affected_process,
                "status": r.status,
                "notes": r.notes,
                "is_simulation": r.is_simulation
            }
            for r in rows
        ]


def _get_alerts_summary_sync() -> Dict[str, Any]:
    with get_db() as db:
        total = db.query(Alert).count()
        new_count = db.query(Alert).filter(Alert.status == "New").count()
        critical_count = db.query(Alert).filter(Alert.severity == "Critical").count()
        return {
            "total": total,
            "new": new_count,
            "critical": critical_count
        }


@router.get("")
async def get_alerts(status_filter: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    return await asyncio.to_thread(_get_alerts_sync, status_filter, limit)


@router.get("/summary")
async def get_alerts_summary() -> Dict[str, Any]:
    return await asyncio.to_thread(_get_alerts_summary_sync)


@router.put("/{alert_id}/status")
async def update_alert_status(alert_id: int, payload: AlertStatusUpdate) -> Dict[str, Any]:
    def _update():
        with get_db() as db:
            updated = alert_service.update_alert_status(db, alert_id, payload.status, payload.resolved_by, payload.notes)
            if not updated:
                return None
            return {"id": updated.id, "status": updated.status}

    res = await asyncio.to_thread(_update)
    if res is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return res
