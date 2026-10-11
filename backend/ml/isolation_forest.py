import numpy as np
import joblib
import datetime
from sklearn.ensemble import IsolationForest
from typing import Dict, Any
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from config import settings
except ImportError:
    # Fallback config
    class DummySettings:
        IF_N_ESTIMATORS = 100
        IF_CONTAMINATION = 0.05
        RANDOM_SEED = 42
    settings = DummySettings()

class IsolationForestModel:
    """
    Isolation Forest anomaly detection model.
    NOTE: Anomaly scores are NOT malware probabilities. They indicate deviations from baseline behavior.
    """
    def __init__(self):
        self.model = IsolationForest(
            n_estimators=settings.IF_N_ESTIMATORS,
            contamination=settings.IF_CONTAMINATION,
            random_state=settings.RANDOM_SEED
        )
        self._is_trained = False
        self.metadata = {
            "name": "IsolationForest",
            "version": "1.0",
            "training_date": None,
            "n_samples": 0,
            "hyperparams": {
                "n_estimators": settings.IF_N_ESTIMATORS,
                "contamination": settings.IF_CONTAMINATION,
                "random_state": settings.RANDOM_SEED
            }
        }
        self._train_scores_min = -0.5
        self._train_scores_max = 0.5

    @property
    def is_trained(self) -> bool:
        return self._is_trained

    def train(self, X: np.ndarray) -> None:
        self.model.fit(X)
        self._is_trained = True
        self.metadata["training_date"] = datetime.datetime.now().isoformat()
        self.metadata["n_samples"] = X.shape[0]
        
        # Calculate min and max of decision function for normalization during predict
        scores = self.model.decision_function(X)
        self._train_scores_min = float(np.min(scores))
        self._train_scores_max = float(np.max(scores))

    def predict(self, X: np.ndarray) -> np.ndarray:
        if not self.is_trained:
            raise RuntimeError("IsolationForestModel is not trained.")
        
        # decision_function: higher values are normal, lower values are anomalies.
        raw_scores = self.model.decision_function(X)
        
        # Normalize to 0-1 where 1 is anomalous
        # score = (1 - raw_decision_function_normalized) / 2 clamped to [0,1]
        range_val = (self._train_scores_max - self._train_scores_min)
        if range_val == 0:
            range_val = 1.0
        
        normalized_decision = (raw_scores - self._train_scores_min) / range_val
        anomaly_scores = (1 - normalized_decision) / 2
        return np.clip(anomaly_scores, 0.0, 1.0)

    def save(self, path: str) -> None:
        state = {
            "model": self.model,
            "is_trained": self._is_trained,
            "metadata": self.metadata,
            "train_scores_min": self._train_scores_min,
            "train_scores_max": self._train_scores_max
        }
        joblib.dump(state, path)

    def load(self, path: str) -> None:
        state = joblib.load(path)
        self.model = state["model"]
        self._is_trained = state["is_trained"]
        self.metadata = state["metadata"]
        self._train_scores_min = state["train_scores_min"]
        self._train_scores_max = state["train_scores_max"]

    def get_metadata(self) -> Dict[str, Any]:
        return self.metadata
