"""
Base collector class for all telemetry collectors.
Provides common interface and error handling.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from datetime import datetime
import logging
import platform


class BaseCollector(ABC):
    """Abstract base class for all telemetry collectors."""

    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.os_type = platform.system().lower()
        if self.os_type == "darwin":
            self.os_type = "macos"
        self._available = True
        self._last_error: Optional[str] = None
        self._last_collect_time: Optional[datetime] = None
        self._previous_data: Optional[Dict[str, Any]] = None

    @property
    def name(self) -> str:
        """Collector name for logging and display."""
        return self.__class__.__name__

    @property
    def available(self) -> bool:
        """Whether this collector can provide data on this system."""
        return self._available

    @property
    def last_error(self) -> Optional[str]:
        return self._last_error

    @abstractmethod
    def collect(self) -> Dict[str, Any]:
        """
        Collect telemetry data.
        Must return a dict of metric_name: value.
        Unavailable metrics should be None with a note.
        Must never raise exceptions - return error state instead.
        """
        pass

    def safe_collect(self) -> Dict[str, Any]:
        """
        Safely collect data with error handling.
        Wraps collect() to catch any unexpected exceptions.
        """
        try:
            data = self.collect()
            self._last_collect_time = datetime.utcnow()
            self._last_error = None
            self._previous_data = data
            return data
        except Exception as e:
            self.logger.error(f"Collection failed: {e}")
            self._last_error = str(e)
            return self._get_unavailable_data()

    def _get_unavailable_data(self) -> Dict[str, Any]:
        """Return a dict indicating all data is unavailable."""
        return {
            "available": False,
            "error": self._last_error or "Unavailable on this system"
        }

    def get_status(self) -> Dict[str, Any]:
        """Get collector status for health monitoring."""
        return {
            "name": self.name,
            "available": self._available,
            "last_collect_time": self._last_collect_time.isoformat() if self._last_collect_time else None,
            "last_error": self._last_error,
            "os_type": self.os_type,
        }
