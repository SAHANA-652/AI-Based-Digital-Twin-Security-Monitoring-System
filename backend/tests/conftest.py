import pytest
import numpy as np
from fastapi.testclient import TestClient

@pytest.fixture
def temp_db():
    return "sqlite:///:memory:"

@pytest.fixture
def sample_telemetry():
    return {
        "cpu_percent": 45.0,
        "ram_total": 16000000000,
        "ram_used": 8000000000,
        "network_bytes_sent": 1024,
        "network_bytes_recv": 2048,
        "disk_read_bytes": 5000,
        "disk_write_bytes": 10000,
        "temperature": 45.0
    }

@pytest.fixture
def sample_processes():
    return [
        {"pid": 1, "name": "system", "cpu_percent": 0.1, "memory_percent": 0.1, "path": "/sbin/init"},
        {"pid": 1234, "name": "python", "cpu_percent": 15.0, "memory_percent": 2.5, "path": "/usr/bin/python3"}
    ]

@pytest.fixture
def sample_connections():
    return [
        {"fd": 10, "family": 2, "type": 1, "laddr": ("127.0.0.1", 8000), "raddr": ("127.0.0.1", 54321), "status": "ESTABLISHED"}
    ]

@pytest.fixture
def sample_auth_events():
    return [
        {"user": "admin", "status": "success", "ip": "192.168.1.100"},
        {"user": "root", "status": "failed", "ip": "10.0.0.5"}
    ]

@pytest.fixture
def ml_training_data():
    return np.random.normal(loc=0, scale=1, size=(100, 10))

@pytest.fixture
def app_client():
    from main import app
    client = TestClient(app, raise_server_exceptions=False)
    return client
