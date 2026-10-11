from fastapi import APIRouter
from services.monitoring_service import monitoring_service
from typing import Dict, Any

router = APIRouter(prefix="/twin", tags=["digital_twin"])


@router.get("/state")
async def get_twin_state() -> Dict[str, Any]:
    twin = monitoring_service.get_twin_snapshot()
    return {
        "current_state": twin.get("state", monitoring_service.digital_twin.current_state),
        "baseline_state": monitoring_service.digital_twin.baseline_state,
        "expected_state": monitoring_service.digital_twin.expected_state,
        "deviations": twin.get("deviations", monitoring_service.digital_twin.get_deviation()),
        "summary": twin.get("summary", monitoring_service.digital_twin.get_state_summary()),
        "sequence_id": monitoring_service.get_state_field("sequence_id"),
        "timestamp": monitoring_service.get_state_field("timestamp"),
        "mode": monitoring_service.get_state_field("mode")
    }


@router.get("/deviation")
async def get_twin_deviation() -> Dict[str, Any]:
    return monitoring_service.digital_twin.get_deviation()


@router.get("/baseline")
async def get_baseline_info() -> Dict[str, Any]:
    return {
        "is_trusted": monitoring_service.digital_twin.baseline_manager.is_trusted,
        "confidence": monitoring_service.digital_twin.baseline_manager.confidence,
        "sample_count": monitoring_service.digital_twin.baseline_manager.sample_count,
        "metrics": monitoring_service.digital_twin.metrics
    }


@router.get("/baseline/progress")
async def get_baseline_progress() -> Dict[str, Any]:
    return monitoring_service.digital_twin.baseline_manager.get_learning_progress()
