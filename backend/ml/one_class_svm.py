import numpy as np
import joblib
import datetime
from sklearn.svm import OneClassSVM
from typing import Dict, Any
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from config import settings
except ImportError:
    class DummySettings:
        OCSVM_KERNEL = 'rbf'
        OCSVM_NU = 0.05
        OCSVM_GAMMA = 'scale'
    settings = DummySettings()

class OneClassSVMModel:
    """
    One-Class SVM anomaly detection model.
    NOTE: Anomaly scores are NOT malware probabilities. They indicate deviations from baseline behavior.
    """
    def __init__(self):
        self.model = OneClassSVM(
            kernel=settings.OCSVM_KERNEL,
            nu=settings.OCSVM_NU,
            gamma=settings.OCSVM_GAMMA
        )
        self._is_trained = False
        self.metadata = {
            "name": "OneClassSVM",
            "version": "1.0",
            "training_date": None,
            "n_samples": 0,
            "hyperparams": {
                "kernel": settings.OCSVM_KERNEL,
                "nu": settings.OCSVM_NU,
                "gamma": settings.OCSVM_GAMMA
            }
        }
        self._train_scores_min = -1.0
        self._train_scores_max = 1.0

    @property
    def is_trained(self) -> bool:
        return self._is_trained

    def train(self, X: np.ndarray) -> None:
        self.model.fit(X)
        self._is_trained = True
        self.metadata["training_date"] = datetime.datetime.now().isoformat()
        self.metadata["n_samples"] = X.shape[0]
        
        scores = self.model.decision_function(X)
        self._train_scores_min = float(np.min(scores))
        self._train_scores_max = float(np.max(scores))

    def predict(self, X: np.ndarray) -> np.ndarray:
        if not self.is_trained:
            raise RuntimeError("OneClassSVMModel is not trained.")
        
        raw_scores = self.model.decision_function(X)
        # decision_function > 0 is normal, < 0 is anomaly
        # we want 0 = normal, 1 = anomalous
        
        # scale to [0,1]
        range_val = self._train_scores_max - self._train_scores_min
        if range_val == 0:
            range_val = 1.0
            
        normalized = (raw_scores - self._train_scores_min) / range_val
        anomaly_scores = 1.0 - normalized
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
