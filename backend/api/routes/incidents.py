import asyncio
from fastapi import APIRouter
from database.connection import get_db
from database.models import Incident
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

router = APIRouter(prefix="/incidents", tags=["incidents"])


class IncidentCreate(BaseModel):
    title: str
    description: str
    severity: str = "High"


def _get_incidents_sync() -> List[Dict[str, Any]]:
    with get_db() as db:
        rows = db.query(Incident).order_by(Incident.created_at.desc()).limit(100).all()
        return [
            {
                "id": r.id,
                "title": r.title,
                "description": r.description,
                "severity": r.severity,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None
            }
            for r in rows
        ]


@router.get("")
async def get_incidents() -> List[Dict[str, Any]]:
    return await asyncio.to_thread(_get_incidents_sync)


@router.post("")
async def create_incident(payload: IncidentCreate) -> Dict[str, Any]:
    def _create():
        with get_db() as db:
            inc = Incident(
                title=payload.title,
                description=payload.description,
                severity=payload.severity,
                status="Open"
            )
            db.add(inc)
            db.commit()
            db.refresh(inc)
            return {"id": inc.id, "title": inc.title, "status": inc.status}

    return await asyncio.to_thread(_create)
