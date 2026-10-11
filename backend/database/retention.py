"""Data retention management for the database."""

from datetime import datetime, timedelta
from sqlalchemy import delete
from database.models import (
    Telemetry, ProcessSnapshot, NetworkConnection,
    MLResult, RiskScore, AuthenticationEvent, SecurityEvent
)
from database.connection import get_db
import logging

logger = logging.getLogger(__name__)


class RetentionManager:
    """Manages data retention policies to prevent unbounded storage growth."""

    def __init__(self, retention_hours: int = 168):
        self.retention_hours = retention_hours  # default 7 days

    def cleanup(self) -> dict:
        """Run retention cleanup on all high-frequency tables. Returns counts of deleted rows."""
        cutoff = datetime.utcnow() - timedelta(hours=self.retention_hours)
        results = {}

        tables = [
            ("telemetry", Telemetry),
            ("process_snapshots", ProcessSnapshot),
            ("network_connections", NetworkConnection),
            ("ml_results", MLResult),
            ("risk_scores", RiskScore),
        ]

        with get_db() as db:
            for name, model in tables:
                try:
                    stmt = delete(model).where(model.timestamp < cutoff)
                    result = db.execute(stmt)
                    results[name] = result.rowcount
                except Exception as e:
                    logger.error(f"Retention cleanup failed for {name}: {e}")
                    results[name] = -1

        total = sum(v for v in results.values() if v > 0)
        if total > 0:
            logger.info(f"Retention cleanup: removed {total} old records (cutoff: {cutoff})")

        return results
