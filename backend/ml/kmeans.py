import numpy as np
import joblib
import datetime
from sklearn.cluster import KMeans
from typing import Dict, Any, List, Tuple
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from config import settings
except ImportError:
    class DummySettings:
        KMEANS_N_CLUSTERS = 6
        RANDOM_SEED = 42
    settings = DummySettings()

class KMeansModel:
    """
    KMeans clustering model for behavioral context mapping.
    """
    CONTEXT_LABELS = ['Idle', 'Normal Work', 'Heavy Workload', 'Network Intensive', 'Development', 'Other']
    
    def __init__(self):
        self.model = KMeans(
            n_clusters=settings.KMEANS_N_CLUSTERS,
            random_state=settings.RANDOM_SEED,
            n_init='auto'
        )
        self._is_trained = False
        self.cluster_labels_map: Dict[int, str] = {}
        self.max_distances: Dict[int, float] = {}
        self.metadata = {
            "name": "KMeans",
            "version": "1.0",
            "training_date": None,
            "n_samples": 0,
            "hyperparams": {
                "n_clusters": settings.KMEANS_N_CLUSTERS,
                "random_state": settings.RANDOM_SEED
            }
        }

    @property
    def is_trained(self) -> bool:
        return self._is_trained

    def train(self, X: np.ndarray) -> None:
        self.model.fit(X)
        self._is_trained = True
        self.metadata["training_date"] = datetime.datetime.now().isoformat()
        self.metadata["n_samples"] = X.shape[0]
        
        # Assign meaningful labels to clusters based on centroids
        self._assign_cluster_labels()
        
        # Calculate max distances for normalization
        labels = self.model.labels_
        distances = self.model.transform(X)
        for i in range(settings.KMEANS_N_CLUSTERS):
            cluster_points = distances[labels == i, i]
            if len(cluster_points) > 0:
                self.max_distances[i] = float(np.max(cluster_points))
            else:
                self.max_distances[i] = 1.0

    def _assign_cluster_labels(self) -> None:
        centroids = self.model.cluster_centers_
        # Dummy logic: just assign from the predefined list sequentially,
        # in a real system we would analyze centroid features (cpu, net, etc.)
        n_clusters = len(centroids)
        for i in range(n_clusters):
            label = self.CONTEXT_LABELS[i % len(self.CONTEXT_LABELS)]
            self.cluster_labels_map[i] = label

    def predict(self, X: np.ndarray) -> List[Dict[str, Any]]:
        if not self.is_trained:
            raise RuntimeError("KMeansModel is not trained.")
        
        cluster_ids = self.model.predict(X)
        distances = self.model.transform(X)
        
        results = []
        for idx, c_id in enumerate(cluster_ids):
            dist = distances[idx, c_id]
            results.append({
                "cluster_id": int(c_id),
                "cluster_label": self.cluster_labels_map.get(c_id, "Unknown"),
                "distance_to_centroid": float(dist)
            })
        return results

    def get_anomaly_contribution(self, X: np.ndarray) -> np.ndarray:
        """Return a 0-1 score based on distance from nearest centroid."""
        if not self.is_trained:
            raise RuntimeError("KMeansModel is not trained.")
        
        cluster_ids = self.model.predict(X)
        distances = self.model.transform(X)
        
        scores = []
        for idx, c_id in enumerate(cluster_ids):
            dist = distances[idx, c_id]
            max_d = self.max_distances.get(c_id, 1.0)
            score = dist / max_d if max_d > 0 else 0.0
            scores.append(score)
            
        return np.clip(np.array(scores), 0.0, 1.0)

    def save(self, path: str) -> None:
        state = {
            "model": self.model,
            "is_trained": self._is_trained,
            "cluster_labels_map": self.cluster_labels_map,
            "max_distances": self.max_distances,
            "metadata": self.metadata
        }
        joblib.dump(state, path)

    def load(self, path: str) -> None:
        state = joblib.load(path)
        self.model = state["model"]
        self._is_trained = state["is_trained"]
        self.cluster_labels_map = state["cluster_labels_map"]
        self.max_distances = state["max_distances"]
        self.metadata = state["metadata"]

    def get_metadata(self) -> Dict[str, Any]:
        return self.metadata
