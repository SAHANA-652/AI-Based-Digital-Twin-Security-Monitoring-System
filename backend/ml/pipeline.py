import os
import threading
import datetime
import numpy as np
import pandas as pd
import joblib
from typing import Dict, Any, List

from .preprocessor import MLPreprocessor
from .isolation_forest import IsolationForestModel
from .one_class_svm import OneClassSVMModel
from .autoencoder import AutoencoderModel
from .kmeans import KMeansModel
from .ensemble import MLEnsemble
from .evaluation import ModelEvaluator

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from config import settings
except ImportError:
    class DummySettings:
        RETRAIN_INTERVAL_HOURS = 24
        MODEL_DIR = os.path.join(os.path.dirname(__file__), 'saved_models')
        MODELS_DIR = MODEL_DIR
    settings = DummySettings()


class MLPipeline:
    """
    Orchestrator for all ML components.
    """
    def __init__(self):
        self.preprocessor = MLPreprocessor()
        self.if_model = IsolationForestModel()
        self.ocsvm_model = OneClassSVMModel()
        self.ae_model = AutoencoderModel()
        self.kmeans_model = KMeansModel()
        self.ensemble = MLEnsemble()
        self.evaluator = ModelEvaluator()
        
        self.models_dir = str(getattr(settings, "MODEL_DIR", getattr(settings, "MODELS_DIR", os.path.join(os.path.dirname(__file__), 'saved_models'))))
        self._lock = threading.Lock()
        self.last_trained_time = None

    def initialize(self) -> None:
        os.makedirs(self.models_dir, exist_ok=True)
        # Attempt to load saved models if present
        try:
            self.load_all()
        except Exception:
            pass

    @property
    def is_trained(self) -> bool:
        return (self.preprocessor.is_fitted and 
                self.if_model.is_trained and 
                self.ocsvm_model.is_trained and 
                self.ae_model.is_trained and 
                self.kmeans_model.is_trained)

    def needs_retrain(self) -> bool:
        if not self.is_trained or not self.last_trained_time:
            return True
        now = datetime.datetime.now()
        diff = now - self.last_trained_time
        retrain_hours = getattr(settings, "RETRAIN_INTERVAL_HOURS", 24)
        return diff.total_seconds() > (retrain_hours * 3600)

    def train(self, training_data: pd.DataFrame) -> None:
        with self._lock:
            feature_names = list(training_data.columns)
            X_raw = training_data.values.astype(np.float32)
            
            X_scaled = self.preprocessor.fit_transform(X_raw, feature_names)
            
            self.if_model.train(X_scaled)
            self.ocsvm_model.train(X_scaled)
            self.ae_model.train(X_scaled)
            self.kmeans_model.train(X_scaled)
            
            self.last_trained_time = datetime.datetime.now()
            try:
                self.save_all()
            except Exception as e:
                print(f"Error persisting models: {e}")

    def predict(self, feature_vector: np.ndarray) -> Dict[str, Any]:
        with self._lock:
            if not self.is_trained:
                return {
                    "ensemble_score": 0.0,
                    "anomaly_score": 0.0,
                    "is_anomaly": False,
                    "models": {
                        "isolation_forest": 0.0,
                        "one_class_svm": 0.0,
                        "autoencoder": 0.0,
                        "kmeans": {"score": 0.0, "cluster_id": 0, "cluster_label": "Normal Work"}
                    },
                    "explanation": "Models calibrating on baseline"
                }
            
            if feature_vector.ndim == 1:
                X_raw = feature_vector.reshape(1, -1)
            else:
                X_raw = feature_vector
                
            X_scaled = self.preprocessor.transform(X_raw)
            
            if_scores = self.if_model.predict(X_scaled)
            ocsvm_scores = self.ocsvm_model.predict(X_scaled)
            ae_scores = self.ae_model.predict(X_scaled)
            kmeans_res = self.kmeans_model.predict(X_scaled)
            kmeans_scores = self.kmeans_model.get_anomaly_contribution(X_scaled)
            
            scores_dict = {
                "if_score": if_scores,
                "ocsvm_score": ocsvm_scores,
                "ae_score": ae_scores,
                "kmeans_score": kmeans_scores
            }
            
            ens_scores, is_anom = self.ensemble.predict(scores_dict)
            
            single_scores = {k: v[0] for k, v in scores_dict.items()}
            explanation_data = self.ensemble.get_explanation(single_scores)
            
            return {
                "ensemble_score": float(ens_scores[0]),
                "anomaly_score": float(ens_scores[0]),
                "is_anomaly": bool(is_anom[0]),
                "models": {
                    "isolation_forest": float(if_scores[0]),
                    "one_class_svm": float(ocsvm_scores[0]),
                    "autoencoder": float(ae_scores[0]),
                    "kmeans": {
                        "score": float(kmeans_scores[0]),
                        "cluster_id": kmeans_res[0]["cluster_id"],
                        "cluster_label": kmeans_res[0]["cluster_label"]
                    }
                },
                "explanation": explanation_data.get("explanation", "Ensemble prediction evaluated against baseline.") if isinstance(explanation_data, dict) else "Baseline match"
            }

    def save_all(self) -> None:
        with self._lock:
            if not self.is_trained:
                return
            os.makedirs(self.models_dir, exist_ok=True)
            self.preprocessor.save(os.path.join(self.models_dir, 'preprocessor.pkl'))
            self.if_model.save(os.path.join(self.models_dir, 'if_model.pkl'))
            self.ocsvm_model.save(os.path.join(self.models_dir, 'ocsvm_model.pkl'))
            self.ae_model.save(os.path.join(self.models_dir, 'ae_model.pkl'))
            self.kmeans_model.save(os.path.join(self.models_dir, 'kmeans_model.pkl'))
            joblib.dump({"last_trained_time": self.last_trained_time}, os.path.join(self.models_dir, 'pipeline_meta.pkl'))

    def load_all(self) -> None:
        with self._lock:
            try:
                self.preprocessor.load(os.path.join(self.models_dir, 'preprocessor.pkl'))
                self.if_model.load(os.path.join(self.models_dir, 'if_model.pkl'))
                self.ocsvm_model.load(os.path.join(self.models_dir, 'ocsvm_model.pkl'))
                self.ae_model.load(os.path.join(self.models_dir, 'ae_model.pkl'))
                self.kmeans_model.load(os.path.join(self.models_dir, 'kmeans_model.pkl'))
                meta = joblib.load(os.path.join(self.models_dir, 'pipeline_meta.pkl'))
                self.last_trained_time = meta.get("last_trained_time")
            except Exception as e:
                pass

    def get_status(self) -> Dict[str, Any]:
        return {
            "is_trained": self.is_trained,
            "last_trained_time": self.last_trained_time.isoformat() if self.last_trained_time else None,
            "needs_retrain": self.needs_retrain(),
            "models": {
                "isolation_forest": self.if_model.is_trained,
                "one_class_svm": self.ocsvm_model.is_trained,
                "autoencoder": self.ae_model.is_trained,
                "kmeans": self.kmeans_model.is_trained,
                "preprocessor": self.preprocessor.is_fitted
            }
        }
