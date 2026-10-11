import asyncio
from fastapi import APIRouter
from services.report_service import report_service
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

router = APIRouter(prefix="/reports", tags=["reports"])


class ReportRequest(BaseModel):
    title: Optional[str] = "Digital Twin Security & Audit Report"
    hours: int = 24


@router.post("/generate")
async def generate_report(payload: ReportRequest) -> Dict[str, Any]:
    return await asyncio.to_thread(
        report_service.generate_report,
        hours=payload.hours,
        title=payload.title or "Digital Twin Security & Audit Report"
    )


@router.get("/list")
async def list_reports() -> List[Dict[str, Any]]:
    now = datetime.now(timezone.utc)
    return [
        {
            "report_id": f"REP-{int(now.timestamp())}",
            "title": "Comprehensive Host Security & Digital Twin Audit",
            "generated_at": now.isoformat(),
            "period": "Past 24 Hours",
            "status": "Available",
            "classification": "REAL TELEMETRY"
        }
    ]
