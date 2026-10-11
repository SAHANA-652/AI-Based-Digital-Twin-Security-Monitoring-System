"""
Central configuration for the Digital Twin Security Monitoring System.
All settings have sensible defaults and can be overridden via environment variables.
"""

import os
from pathlib import Path
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = DATA_DIR / "models"
LOG_DIR = BASE_DIR / "logs"
DB_PATH = DATA_DIR / "digital_twin.db"

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
MODEL_DIR.mkdir(parents=True, exist_ok=True)
LOG_DIR.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # --- Application ---
    APP_NAME: str = "AI-Based Digital Twin Security Monitoring System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # --- Paths ---
    BASE_DIR: Path = BASE_DIR
    DATA_DIR: Path = DATA_DIR
    MODEL_DIR: Path = MODEL_DIR
    LOG_DIR: Path = LOG_DIR
    DB_PATH: Path = DB_PATH

    # --- Database ---
    DATABASE_URL: str = f"sqlite:///{DB_PATH}"

    # --- Authentication ---
    SECRET_KEY: str = "digital-twin-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    DEFAULT_ADMIN_USERNAME: str = "admin"
    DEFAULT_ADMIN_PASSWORD: str = "admin123"

    # --- Telemetry Collection ---
    COLLECTION_INTERVAL: float = 1.0  # seconds
    PROCESS_COLLECTION_INTERVAL: float = 3.0  # seconds (heavier)
    NETWORK_COLLECTION_INTERVAL: float = 2.0  # seconds
    AUTH_COLLECTION_INTERVAL: float = 10.0  # seconds
    MAX_PROCESSES_TRACKED: int = 200
    MAX_NETWORK_CONNECTIONS_TRACKED: int = 300
    TELEMETRY_HISTORY_RETENTION_HOURS: int = 168  # 7 days
    SNAPSHOT_INTERVAL: float = 5.0  # DB snapshot interval in seconds

    # --- Digital Twin ---
    BASELINE_LEARNING_PERIOD_MINUTES: int = 30
    BASELINE_ADAPTATION_RATE: float = 0.01  # slow adaptation
    BASELINE_CONFIDENCE_THRESHOLD: float = 0.7
    BASELINE_POISONING_THRESHOLD: float = 3.0  # z-score threshold
    BASELINE_MIN_SAMPLES: int = 100

    # --- Feature Engineering ---
    SLIDING_WINDOW_1S: int = 1
    SLIDING_WINDOW_5S: int = 5
    SLIDING_WINDOW_30S: int = 30
    SLIDING_WINDOW_5M: int = 300
    ZSCORE_THRESHOLD: float = 2.5

    # --- ML Models ---
    ML_TRAINING_MIN_SAMPLES: int = 200
    ML_RETRAIN_INTERVAL_MINUTES: int = 60
    RANDOM_SEED: int = 42

    # Isolation Forest
    IF_N_ESTIMATORS: int = 100
    IF_CONTAMINATION: float = 0.05
    IF_MAX_SAMPLES: str = "auto"

    # One-Class SVM
    OCSVM_KERNEL: str = "rbf"
    OCSVM_NU: float = 0.05
    OCSVM_GAMMA: str = "scale"

    # Autoencoder
    AE_ENCODING_DIM: int = 8
    AE_EPOCHS: int = 50
    AE_BATCH_SIZE: int = 32
    AE_VALIDATION_SPLIT: float = 0.2
    AE_LEARNING_RATE: float = 0.001
    AE_THRESHOLD_PERCENTILE: float = 95.0

    # K-Means
    KMEANS_N_CLUSTERS: int = 6
    KMEANS_MAX_ITER: int = 300

    # Ensemble weights (must sum to 1.0)
    ENSEMBLE_WEIGHT_IF: float = 0.30
    ENSEMBLE_WEIGHT_OCSVM: float = 0.25
    ENSEMBLE_WEIGHT_AE: float = 0.30
    ENSEMBLE_WEIGHT_KMEANS: float = 0.15

    # --- Risk Engine ---
    RISK_THRESHOLD_INFORMATIONAL: int = 19
    RISK_THRESHOLD_LOW: int = 39
    RISK_THRESHOLD_MODERATE: int = 59
    RISK_THRESHOLD_HIGH: int = 79
    RISK_THRESHOLD_CRITICAL: int = 100

    RISK_WEIGHT_ML: float = 0.25
    RISK_WEIGHT_BASELINE: float = 0.20
    RISK_WEIGHT_PROCESS: float = 0.15
    RISK_WEIGHT_NETWORK: float = 0.15
    RISK_WEIGHT_AUTH: float = 0.10
    RISK_WEIGHT_HEURISTIC: float = 0.10
    RISK_WEIGHT_THREAT_INTEL: float = 0.05

    # --- Threat Intelligence ---
    # Set TI_MODE=live and configure at least one key for real reputation lookups.
    TI_MODE: str = "demo"  # "demo", "live", "disabled"
    TI_VIRUSTOTAL_API_KEY: Optional[str] = None
    TI_ABUSEIPDB_API_KEY: Optional[str] = None
    ABUSEIPDB_API_KEY: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("ABUSEIPDB_API_KEY", "DTWIN_ABUSEIPDB_API_KEY"),
    )
    TI_CACHE_TTL_MINUTES: int = 60

    # --- WebSocket ---
    WS_UPDATE_INTERVAL: float = 1.0  # seconds

    # --- Logging ---
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"

    model_config = SettingsConfigDict(
        env_prefix="DTWIN_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def get_risk_level(self, score: int) -> str:
        """Get risk level label from score."""
        if score <= self.RISK_THRESHOLD_INFORMATIONAL:
            return "Informational"
        elif score <= self.RISK_THRESHOLD_LOW:
            return "Low"
        elif score <= self.RISK_THRESHOLD_MODERATE:
            return "Moderate"
        elif score <= self.RISK_THRESHOLD_HIGH:
            return "High"
        else:
            return "Critical"


# Singleton instance
settings = Settings()
