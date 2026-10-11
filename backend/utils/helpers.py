"""Utility helpers for the Digital Twin system."""

import hashlib
import platform
from datetime import datetime, timezone
from typing import Optional


def get_os_type() -> str:
    """Get the current OS type as a lowercase string."""
    system = platform.system().lower()
    if system == "darwin":
        return "macos"
    return system  # "windows" or "linux"


def get_timestamp() -> datetime:
    """Get current UTC timestamp."""
    return datetime.now(timezone.utc)


def safe_div(a: float, b: float, default: float = 0.0) -> float:
    """Safe division avoiding ZeroDivisionError."""
    if b == 0:
        return default
    return a / b


def bytes_to_human(num_bytes: float) -> str:
    """Convert bytes to human-readable format."""
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if abs(num_bytes) < 1024.0:
            return f"{num_bytes:.1f} {unit}"
        num_bytes /= 1024.0
    return f"{num_bytes:.1f} PB"


def hash_file(filepath: str, algorithm: str = "sha256") -> Optional[str]:
    """Compute hash of a file. Returns None if file cannot be read."""
    try:
        h = hashlib.new(algorithm)
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()
    except (OSError, PermissionError):
        return None


def clamp(value: float, min_val: float = 0.0, max_val: float = 100.0) -> float:
    """Clamp a value to a range."""
    return max(min_val, min(max_val, value))


def format_duration(seconds: float) -> str:
    """Format seconds into human-readable duration."""
    if seconds < 60:
        return f"{seconds:.0f}s"
    elif seconds < 3600:
        return f"{seconds / 60:.0f}m {seconds % 60:.0f}s"
    elif seconds < 86400:
        hours = int(seconds // 3600)
        mins = int((seconds % 3600) // 60)
        return f"{hours}h {mins}m"
    else:
        days = int(seconds // 86400)
        hours = int((seconds % 86400) // 3600)
        return f"{days}d {hours}h"
