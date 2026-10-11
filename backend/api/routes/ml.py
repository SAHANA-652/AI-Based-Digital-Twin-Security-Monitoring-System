from fastapi import APIRouter
from services.monitoring_service import monitoring_service
from typing import Dict, Any

router = APIRouter(prefix="/ml", tags=["ml"])


@router.get("/status")
async def get_ml_status() -> Dict[str, Any]:
    return monitoring_service.ml_pipeline.get_status()


@router.get("/results/latest")
async def get_latest_ml_results() -> Dict[str, Any]:
    return monitoring_service.get_ml_result_snapshot()


@router.post("/train")
async def trigger_training() -> Dict[str, Any]:
    await monitoring_service.train_models()
    return {"message": "Model training initiated successfully", "status": "training_complete"}


@router.get("/evaluation")
async def get_evaluation() -> Dict[str, Any]:
    return {
        "status": "Evaluation not available",
        "note": "Unsupervised anomaly detection models (Isolation Forest, One-Class SVM, Autoencoder, K-Means) detect deviations from baseline without fabricating ground-truth malware labels."
    }


@router.get("/models")
async def get_models_metadata() -> Dict[str, Any]:
    return {
        "isolation_forest": monitoring_service.ml_pipeline.if_model.get_metadata() if monitoring_service.ml_pipeline.if_model else {},
        "one_class_svm": monitoring_service.ml_pipeline.ocsvm_model.get_metadata() if monitoring_service.ml_pipeline.ocsvm_model else {},
        "autoencoder": monitoring_service.ml_pipeline.ae_model.get_metadata() if monitoring_service.ml_pipeline.ae_model else {},
        "kmeans": monitoring_service.ml_pipeline.kmeans_model.get_metadata() if monitoring_service.ml_pipeline.kmeans_model else {}
    }
