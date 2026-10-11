import numpy as np
import datetime
from sklearn.metrics import precision_score, recall_score, f1_score, accuracy_score, confusion_matrix
from typing import Dict, Any, Optional

class ModelEvaluator:
    """
    Evaluator for supervised and unsupervised ML models.
    """
    def __init__(self):
        self.evaluation_history = []

    def evaluate_supervised(self, y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, Any]:
        precision = precision_score(y_true, y_pred, zero_division=0)
        recall = recall_score(y_true, y_pred, zero_division=0)
        f1 = f1_score(y_true, y_pred, zero_division=0)
        accuracy = accuracy_score(y_true, y_pred)
        cm = confusion_matrix(y_true, y_pred).tolist()
        
        result = {
            "timestamp": datetime.datetime.now().isoformat(),
            "type": "supervised",
            "metrics": {
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "accuracy": accuracy,
                "confusion_matrix": cm
            }
        }
        self.evaluation_history.append(result)
        return result

    def evaluate_unsupervised(self, model: Any, X_normal: np.ndarray, X_anomalous: Optional[np.ndarray] = None) -> Dict[str, Any]:
        """
        Evaluate unsupervised model. Note: standard accuracy metrics require labeled data.
        """
        result = {
            "timestamp": datetime.datetime.now().isoformat(),
            "type": "unsupervised",
            "note": "Standard accuracy metrics require labeled data. Evaluating on data distribution."
        }
        
        if X_anomalous is None:
            result["metrics"] = "Evaluation not available (no anomalous data provided)"
        else:
            try:
                # Assuming model has predict method returning 0-1 scores where higher is more anomalous
                normal_scores = model.predict(X_normal)
                anomalous_scores = model.predict(X_anomalous)
                
                # Assume threshold 0.5 for demonstration
                y_true = np.concatenate([np.zeros(len(X_normal)), np.ones(len(X_anomalous))])
                y_pred_scores = np.concatenate([normal_scores, anomalous_scores])
                y_pred = (y_pred_scores > 0.5).astype(int)
                
                metrics = self.evaluate_supervised(y_true, y_pred)["metrics"]
                result["metrics"] = metrics
            except Exception as e:
                result["metrics"] = f"Evaluation not available: {str(e)}"
                
        self.evaluation_history.append(result)
        return result

    def get_evaluation_report(self) -> Dict[str, Any]:
        return {
            "total_evaluations": len(self.evaluation_history),
            "history": self.evaluation_history,
            "latest": self.evaluation_history[-1] if self.evaluation_history else None
        }
