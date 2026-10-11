from fastapi import APIRouter, HTTPException
from services.monitoring_service import monitoring_service
from typing import List, Dict, Any

router = APIRouter(prefix="/processes", tags=["processes"])


@router.get("")
async def get_processes() -> List[Dict[str, Any]]:
    return monitoring_service.get_processes_snapshot()


@router.get("/{pid}")
async def get_process_detail(pid: int) -> Dict[str, Any]:
    procs = monitoring_service.get_processes_snapshot()
    for p in procs:
        if p.get('pid') == pid:
            tree = monitoring_service.process_analyzer.get_process_tree(pid, procs)
            risk = monitoring_service.process_analyzer.get_process_risk(p)
            return {
                "process": p,
                "tree": tree,
                "risk": risk
            }
    raise HTTPException(status_code=404, detail="Process not found or terminated")


@router.get("/{pid}/tree")
async def get_process_tree(pid: int) -> Dict[str, Any]:
    procs = monitoring_service.get_processes_snapshot()
    tree = monitoring_service.process_analyzer.get_process_tree(pid, procs)
    if not tree:
        raise HTTPException(status_code=404, detail="Process tree unavailable")
    return tree
