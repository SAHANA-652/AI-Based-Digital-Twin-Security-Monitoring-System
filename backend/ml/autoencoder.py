"""
Autoencoder Anomaly Detection Model.
Implemented with high-performance vectorized NumPy neural network layers (dense encoder/decoder, ReLU, Sigmoid, Adam optimizer).
NOTE: Anomaly scores are NOT malware probabilities. They indicate deviations from learned baseline behavior.
"""

import os
import sys
import datetime
import joblib
import numpy as np
from typing import Dict, Any, Optional

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from config import settings
except ImportError:
    class DummySettings:
        AE_EPOCHS = 50
        AE_BATCH_SIZE = 32
        AE_VALIDATION_SPLIT = 0.1
        AE_ENCODING_DIM = 8
        AE_THRESHOLD_PERCENTILE = 95.0
        AE_LEARNING_RATE = 0.001
        RANDOM_SEED = 42
    settings = DummySettings()


class AutoencoderModel:
    """
    Multilayer Neural Network Autoencoder for reconstructing normal telemetry patterns.
    Architecture: input_dim -> 32 -> 16 -> encoding_dim -> 16 -> 32 -> input_dim
    """
    def __init__(self):
        self._is_trained = False
        self.threshold = 0.0
        self.weights = {}
        self.biases = {}
        self.encoding_dim = getattr(settings, "AE_ENCODING_DIM", 8)
        self.epochs = getattr(settings, "AE_EPOCHS", 50)
        self.batch_size = getattr(settings, "AE_BATCH_SIZE", 32)
        self.learning_rate = getattr(settings, "AE_LEARNING_RATE", 0.001)
        self.threshold_percentile = getattr(settings, "AE_THRESHOLD_PERCENTILE", 95.0)
        self.seed = getattr(settings, "RANDOM_SEED", 42)

        self.metadata = {
            "name": "Autoencoder",
            "version": "1.0",
            "training_date": None,
            "n_samples": 0,
            "hyperparams": {
                "epochs": self.epochs,
                "batch_size": self.batch_size,
                "encoding_dim": self.encoding_dim,
                "learning_rate": self.learning_rate,
                "threshold_percentile": self.threshold_percentile,
                "architecture": "input->32->16->encoding_dim->16->32->input"
            }
        }

    @property
    def is_trained(self) -> bool:
        return self._is_trained

    def _init_params(self, input_dim: int) -> None:
        rng = np.random.RandomState(self.seed)
        dims = [input_dim, 32, 16, self.encoding_dim, 16, 32, input_dim]
        
        self.weights = {}
        self.biases = {}
        for i in range(len(dims) - 1):
            # He / Xavier initialization
            scale = np.sqrt(2.0 / dims[i])
            self.weights[f"W{i+1}"] = rng.randn(dims[i], dims[i+1]).astype(np.float32) * scale
            self.biases[f"b{i+1}"] = np.zeros((1, dims[i+1]), dtype=np.float32)

    def _relu(self, x: np.ndarray) -> np.ndarray:
        return np.maximum(0.0, x)

    def _relu_grad(self, x: np.ndarray) -> np.ndarray:
        return (x > 0).astype(np.float32)

    def _forward(self, X: np.ndarray) -> tuple:
        activations = {"A0": X}
        zs = {}
        num_layers = 6  # 6 transitions: 1->2, 2->3, 3->4, 4->5, 5->6, 6->7
        
        for i in range(1, num_layers + 1):
            prev_a = activations[f"A{i-1}"]
            z = np.dot(prev_a, self.weights[f"W{i}"]) + self.biases[f"b{i}"]
            zs[f"Z{i}"] = z
            if i == num_layers:
                # Output layer linear activation
                a = z
            else:
                a = self._relu(z)
            activations[f"A{i}"] = a
            
        return activations, zs

    def train(self, X: np.ndarray) -> None:
        if X.ndim == 1:
            X = X.reshape(-1, 1)
        X = np.nan_to_num(X, nan=0.0, posinf=1.0, neginf=-1.0).astype(np.float32)
        n_samples, input_dim = X.shape

        self._init_params(input_dim)

        # Adam optimizer state
        m_w = {k: np.zeros_like(v) for k, v in self.weights.items()}
        v_w = {k: np.zeros_like(v) for k, v in self.weights.items()}
        m_b = {k: np.zeros_like(v) for k, v in self.biases.items()}
        v_b = {k: np.zeros_like(v) for k, v in self.biases.items()}
        beta1, beta2, eps = 0.9, 0.999, 1e-8
        t = 0

        batch_size = min(self.batch_size, n_samples)
        num_batches = max(1, n_samples // batch_size)
        num_layers = 6

        for epoch in range(self.epochs):
            indices = np.random.permutation(n_samples)
            X_shuffled = X[indices]

            for b in range(num_batches):
                t += 1
                start_idx = b * batch_size
                end_idx = min(start_idx + batch_size, n_samples)
                X_batch = X_shuffled[start_idx:end_idx]
                m = X_batch.shape[0]
                if m == 0:
                    continue

                # Forward pass
                acts, zs = self._forward(X_batch)
                Y_hat = acts[f"A{num_layers}"]

                # Backward pass (MSE Loss: (Y_hat - X_batch)^2 / m)
                dA = 2.0 * (Y_hat - X_batch) / m
                dZ = dA  # linear output derivative

                grads_w = {}
                grads_b = {}

                for i in range(num_layers, 0, -1):
                    grads_w[f"W{i}"] = np.dot(acts[f"A{i-1}"].T, dZ)
                    grads_b[f"b{i}"] = np.sum(dZ, axis=0, keepdims=True)
                    if i > 1:
                        dA_prev = np.dot(dZ, self.weights[f"W{i}"].T)
                        dZ = dA_prev * self._relu_grad(zs[f"Z{i-1}"])

                # Adam weight update
                for i in range(1, num_layers + 1):
                    key_w = f"W{i}"
                    key_b = f"b{i}"

                    # Weights
                    m_w[key_w] = beta1 * m_w[key_w] + (1 - beta1) * grads_w[key_w]
                    v_w[key_w] = beta2 * v_w[key_w] + (1 - beta2) * (grads_w[key_w] ** 2)
                    m_w_corr = m_w[key_w] / (1 - beta1 ** t)
                    v_w_corr = v_w[key_w] / (1 - beta2 ** t)
                    self.weights[key_w] -= self.learning_rate * m_w_corr / (np.sqrt(v_w_corr) + eps)

                    # Biases
                    m_b[key_b] = beta1 * m_b[key_b] + (1 - beta1) * grads_b[key_b]
                    v_b[key_b] = beta2 * v_b[key_b] + (1 - beta2) * (grads_b[key_b] ** 2)
                    m_b_corr = m_b[key_b] / (1 - beta1 ** t)
                    v_b_corr = v_b[key_b] / (1 - beta2 ** t)
                    self.biases[key_b] -= self.learning_rate * m_b_corr / (np.sqrt(v_b_corr) + eps)

        # Compute reconstruction threshold on training set
        reconstructions, _ = self._forward(X)
        Y_all = reconstructions[f"A{num_layers}"]
        mse = np.mean(np.power(X - Y_all, 2), axis=1)
        self.threshold = float(np.percentile(mse, self.threshold_percentile))
        if self.threshold <= 1e-6:
            self.threshold = float(np.mean(mse) + 2.0 * np.std(mse)) + 1e-4

        self._is_trained = True
        self.metadata["training_date"] = datetime.datetime.now().isoformat()
        self.metadata["n_samples"] = int(n_samples)
        self.metadata["threshold"] = self.threshold

    def get_reconstruction_error(self, X: np.ndarray) -> np.ndarray:
        if not self.is_trained:
            raise RuntimeError("AutoencoderModel is not trained.")
        if X.ndim == 1:
            X = X.reshape(1, -1)
        X = np.nan_to_num(X, nan=0.0).astype(np.float32)
        acts, _ = self._forward(X)
        Y_hat = acts["A6"]
        mse = np.mean(np.power(X - Y_hat, 2), axis=1)
        return mse

    def predict(self, X: np.ndarray) -> np.ndarray:
        if not self.is_trained:
            raise RuntimeError("AutoencoderModel is not trained.")
        mse = self.get_reconstruction_error(X)
        if self.threshold <= 0:
            anomaly_scores = np.zeros_like(mse)
        else:
            anomaly_scores = mse / self.threshold

        return np.clip(anomaly_scores, 0.0, 1.0)

    def save(self, path: str) -> None:
        state = {
            "is_trained": self._is_trained,
            "threshold": self.threshold,
            "weights": self.weights,
            "biases": self.biases,
            "metadata": self.metadata,
            "encoding_dim": self.encoding_dim
        }
        joblib.dump(state, path)

    def load(self, path: str) -> None:
        state = joblib.load(path)
        self._is_trained = state.get("is_trained", False)
        self.threshold = state.get("threshold", 0.0)
        self.weights = state.get("weights", {})
        self.biases = state.get("biases", {})
        self.metadata = state.get("metadata", self.metadata)
        self.encoding_dim = state.get("encoding_dim", self.encoding_dim)

    def get_metadata(self) -> Dict[str, Any]:
        return self.metadata
