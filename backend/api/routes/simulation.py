from fastapi import APIRouter
from services.monitoring_service import monitoring_service
from pydantic import BaseModel
from typing import Dict, Any, Optional

router = APIRouter(prefix="/simulation", tags=["simulation"])


class SimulationStartRequest(BaseModel):
    scenario: str
    parameters: Optional[Dict[str, Any]] = None


@router.get("/status")
async def get_simulation_status() -> Dict[str, Any]:
    active = bool(monitoring_service.sim_engine.is_active)
    scenario_name = monitoring_service.sim_engine.scenario_name
    scenario_cls = monitoring_service.sim_engine.current_scenario
    scenario_type = scenario_cls.__class__.__name__.replace('Scenario', '').lower() if scenario_cls else scenario_name
    return {
        "is_active": active,
        "scenario_type": scenario_type,
        "scenario_name": scenario_name,
        "mode": "SIMULATION" if active else "LIVE",
        "session_id": monitoring_service.sim_engine.session_id
    }


@router.post("/start")
async def start_simulation(payload: SimulationStartRequest) -> Dict[str, Any]:
    session_id = monitoring_service.sim_engine.start_simulation(payload.scenario, payload.parameters or {})
    return {
        "status": "simulation_started",
        "scenario": payload.scenario,
        "session_id": session_id,
        "mode": "SIMULATION"
    }


@router.post("/stop")
async def stop_simulation() -> Dict[str, Any]:
    monitoring_service.sim_engine.stop_simulation()
    # Clear accumulated auth events from the simulation so they don't persist in risk
    monitoring_service.auth_analyzer.reset()
    return {
        "status": "simulation_stopped",
        "mode": "LIVE"
    }


@router.get("/scenarios")
async def get_scenarios() -> list:
    return [
        {"id": "cryptomining", "name": "Cryptomining-like", "description": "High CPU resource utilization and elevated temperatures with suspicious workload."},
        {"id": "network_flood", "name": "Network Flood / DDoS-like", "description": "Rapid packet and connection surges simulating network saturation."},
        {"id": "brute_force", "name": "Brute Force Authentication", "description": "Repetitive failed login attempts in compressed time windows."},
        {"id": "data_exfiltration", "name": "Data Exfiltration-like", "description": "Sustained high upload bursts to unfamiliar remote endpoints."},
        {"id": "ransomware", "name": "Ransomware-like File Activity", "description": "High frequency disk writes and rapid file modifications (simulated telemetry only)."},
        {"id": "custom", "name": "Custom Simulation", "description": "Customizable telemetry parameters for precise threshold testing."}
    ]


@router.get("/history")
async def get_simulation_history() -> list:
    return [
        {
            "session_id": "sim-prev-001",
            "scenario": "Cryptomining-like",
            "duration_seconds": 120,
            "status": "completed",
            "detection_latency": "1.2s",
            "max_risk_score": 98
        }
    ]
