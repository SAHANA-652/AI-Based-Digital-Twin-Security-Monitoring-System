from fastapi import APIRouter
from config import settings
from services.monitoring_service import monitoring_service
from typing import Dict, Any

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
async def get_settings() -> Dict[str, Any]:
    return {
        "app_name": settings.APP_NAME,
        "app_version": settings.APP_VERSION,
        "collection_interval": settings.COLLECTION_INTERVAL,
        "baseline_adaptation_rate": settings.BASELINE_ADAPTATION_RATE,
        "risk_weights": {
            "ml": settings.RISK_WEIGHT_ML,
            "baseline": settings.RISK_WEIGHT_BASELINE,
            "process": settings.RISK_WEIGHT_PROCESS,
            "network": settings.RISK_WEIGHT_NETWORK,
            "auth": settings.RISK_WEIGHT_AUTH,
            "heuristic": settings.RISK_WEIGHT_HEURISTIC,
            "threat_intel": settings.RISK_WEIGHT_THREAT_INTEL
        },
        "ml_models": {
            "isolation_forest_estimators": settings.IF_N_ESTIMATORS,
            "autoencoder_encoding_dim": settings.AE_ENCODING_DIM,
            "kmeans_clusters": settings.KMEANS_N_CLUSTERS
        },
        "retention_hours": settings.TELEMETRY_HISTORY_RETENTION_HOURS,
        "ti_mode": settings.TI_MODE
    }


@router.get("/collectors")
async def get_collectors_status() -> Dict[str, Any]:
    return {
        "collectors": monitoring_service.collector.get_health(),
        "total": len(monitoring_service.collector.collectors),
        "available": sum(1 for v in monitoring_service.collector.get_health().values() if v)
    }
