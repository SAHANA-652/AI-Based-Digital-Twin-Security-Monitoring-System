import numpy as np
from typing import Dict, Any, List, Tuple
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from config import settings
except ImportError:
    class DummySettings:
        ENSEMBLE_WEIGHT_IF = 0.30
        ENSEMBLE_WEIGHT_OCSVM = 0.25
        ENSEMBLE_WEIGHT_AE = 0.30
        ENSEMBLE_WEIGHT_KMEANS = 0.15
        ENSEMBLE_THRESHOLD = 0.50
    settings = DummySettings()


class MLEnsemble:
    """
    Ensemble model combining normalized 0-1 scores from Isolation Forest,
    One-Class SVM, Autoencoder, and K-Means context clustering.
    NOTE: Anomaly scores reflect deviation magnitude, NOT malware probabilities.
    """
    def __init__(self):
        self.weights = {
            "if_score": getattr(settings, "ENSEMBLE_WEIGHT_IF", getattr(settings, "ENS_W_IF", 0.30)),
            "ocsvm_score": getattr(settings, "ENSEMBLE_WEIGHT_OCSVM", getattr(settings, "ENS_W_OCSVM", 0.25)),
            "ae_score": getattr(settings, "ENSEMBLE_WEIGHT_AE", getattr(settings, "ENS_W_AE", 0.30)),
            "kmeans_score": getattr(settings, "ENSEMBLE_WEIGHT_KMEANS", getattr(settings, "ENS_W_KMEANS", 0.15))
        }
        self.threshold = getattr(settings, "ENSEMBLE_THRESHOLD", 0.50)

    def predict(self, scores: Dict[str, np.ndarray]) -> Tuple[np.ndarray, np.ndarray]:
        """
        Combine normalized scores based on available models and weights.
        Dynamically redistributes weights if any model score is missing.
        """
        total_weight = 0.0
        n_samples = None
        for k, v in scores.items():
            if v is not None:
                if n_samples is None:
                    n_samples = len(v)
                if k in self.weights:
                    total_weight += self.weights[k]

        if total_weight == 0 or n_samples is None or n_samples == 0:
            return np.zeros(1 if n_samples is None else n_samples), np.zeros(1 if n_samples is None else n_samples, dtype=bool)

        ensemble_scores = np.zeros(n_samples)
        for k, v in scores.items():
            if v is not None and k in self.weights:
                normalized_weight = self.weights[k] / total_weight
                ensemble_scores += v * normalized_weight

        is_anomaly = ensemble_scores > self.threshold
        return ensemble_scores, is_anomaly

    def get_explanation(self, scores: Dict[str, float]) -> Dict[str, Any]:
        """
        Get explanation dictionary showing each model's contribution to an anomaly score.
        """
        total_weight = sum(self.weights[k] for k in scores.keys() if k in self.weights and scores[k] is not None)
        if total_weight == 0:
            return {"error": "No valid scores provided.", "ensemble_score": 0.0, "is_anomaly": False}

        contributions = {}
        total_score = 0.0

        for k, v in scores.items():
            if v is not None and k in self.weights:
                normalized_w = self.weights[k] / total_weight
                contrib = float(v) * normalized_w
                total_score += contrib
                contributions[k] = {
                    "raw_score": float(v),
                    "weight": float(normalized_w),
                    "weighted_contribution": float(contrib)
                }

        return {
            "ensemble_score": float(total_score),
            "is_anomaly": bool(total_score > self.threshold),
            "contributions": contributions
        }
