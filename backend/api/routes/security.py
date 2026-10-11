import asyncio
from fastapi import APIRouter
from services.monitoring_service import monitoring_service
from database.connection import get_db
from database.models import RiskScore, AuthenticationEvent, Alert
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/security", tags=["security"])


@router.get("/risk")
async def get_security_risk() -> Dict[str, Any]:
    return monitoring_service.get_risk_snapshot()


def _get_risk_history_sync(limit: int, hours: Optional[int]) -> List[Dict[str, Any]]:
    with get_db() as db:
        query = db.query(RiskScore)
        if hours:
            since = datetime.now(timezone.utc) - timedelta(hours=hours)
            query = query.filter(RiskScore.timestamp >= since)
            
        rows = query.order_by(RiskScore.timestamp.desc()).limit(limit).all()
        return [
            {
                "id": r.id,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                "overall_score": r.overall_score,
                "risk_level": r.risk_level,
                "classification": r.classification,
                "explanation": r.explanation,
                "is_simulation": r.is_simulation
            }
            for r in rows
        ]


@router.get("/risk/history")
async def get_risk_history(limit: int = 200, hours: Optional[int] = None) -> List[Dict[str, Any]]:
    return await asyncio.to_thread(_get_risk_history_sync, limit, hours)


@router.get("/heuristics")
async def get_heuristics() -> List[Dict[str, Any]]:
    return monitoring_service.get_heuristics_snapshot()


@router.get("/auth-events")
async def get_auth_events() -> Any:
    return monitoring_service.get_auth_events_snapshot()


def _get_timeline_sync(limit: int) -> List[Dict[str, Any]]:
    heuristics = monitoring_service.get_heuristics_snapshot()
    timestamp = monitoring_service.get_state_field("timestamp")
    timeline: List[Dict[str, Any]] = []

    # 1. Add current live heuristics
    for h in heuristics:
        timeline.append({
            "timestamp": timestamp,
            "event_type": "heuristic",
            "title": h.get("rule_name", "Heuristic Triggered"),
            "severity": h.get("severity", "Moderate"),
            "description": h.get("reason", "Anomaly heuristic evaluated."),
            "evidence": h.get("evidence")
        })

    # 2. Query recorded alerts from database
    with get_db() as db:
        alerts = db.query(Alert).order_by(Alert.timestamp.desc()).limit(limit).all()
        for a in alerts:
            timeline.append({
                "timestamp": a.timestamp.isoformat() if a.timestamp else None,
                "event_type": "alert",
                "title": a.title,
                "severity": a.severity,
                "description": a.description,
                "evidence": a.evidence,
                "is_simulation": a.is_simulation
            })

    # Deduplicate / sort by timestamp desc
    timeline.sort(key=lambda x: str(x.get('timestamp') or ''), reverse=True)
    return timeline[:limit]


@router.get("/timeline")
async def get_security_timeline(limit: int = 50) -> List[Dict[str, Any]]:
    return await asyncio.to_thread(_get_timeline_sync, limit)


@router.get("/events")
async def get_security_events() -> List[Dict[str, Any]]:
    return await asyncio.to_thread(_get_timeline_sync, 50)
