import numpy as np
import joblib
from sklearn.preprocessing import StandardScaler
from typing import List, Optional

class MLPreprocessor:
    """
    ML Preprocessor for feature normalization and handling NaN/inf values.
    """
    def __init__(self):
        self.scaler = StandardScaler()
        self.feature_names: List[str] = []
        self.is_fitted = False

    def fit(self, data: np.ndarray, feature_names: Optional[List[str]] = None) -> None:
        data_clean = self._clean_data(data)
        self.scaler.fit(data_clean)
        if feature_names:
            self.feature_names = feature_names
        self.is_fitted = True

    def transform(self, data: np.ndarray) -> np.ndarray:
        if not self.is_fitted:
            raise RuntimeError("Preprocessor must be fitted before calling transform.")
        data_clean = self._clean_data(data)
        return self.scaler.transform(data_clean)

    def fit_transform(self, data: np.ndarray, feature_names: Optional[List[str]] = None) -> np.ndarray:
        self.fit(data, feature_names)
        return self.transform(data)

    def _clean_data(self, data: np.ndarray) -> np.ndarray:
        # Replace inf with nan, then replace nan with 0 (or could use median)
        cleaned = np.nan_to_num(data, nan=0.0, posinf=0.0, neginf=0.0)
        return cleaned

    def save(self, path: str) -> None:
        joblib.dump({'scaler': self.scaler, 'feature_names': self.feature_names, 'is_fitted': self.is_fitted}, path)

    def load(self, path: str) -> None:
        state = joblib.load(path)
        self.scaler = state['scaler']
        self.feature_names = state['feature_names']
        self.is_fitted = state['is_fitted']
