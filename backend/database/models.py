"""
Database models for the Digital Twin Security Monitoring System.
SQLAlchemy ORM models for all 16+ required tables.
Designed for SQLite with migration path to PostgreSQL/MySQL.
"""

from sqlalchemy import (
    Column, Integer, Float, String, Text, Boolean, DateTime, JSON,
    ForeignKey, Index, Enum as SAEnum, create_engine
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from sqlalchemy.sql import func
from datetime import datetime
import enum

Base = declarative_base()


# ─── Enums ───────────────────────────────────────────────────────────

class RiskLevel(str, enum.Enum):
    INFORMATIONAL = "Informational"
    LOW = "Low"
    MODERATE = "Moderate"
    HIGH = "High"
    CRITICAL = "Critical"


class AlertStatus(str, enum.Enum):
    NEW = "New"
    INVESTIGATING = "Investigating"
    ACKNOWLEDGED = "Acknowledged"
    RESOLVED = "Resolved"
    IGNORED = "Ignored"
    FALSE_POSITIVE = "False Positive"


class BehaviorClassification(str, enum.Enum):
    NORMAL = "Normal"
    ANOMALOUS = "Anomalous"
    SUSPICIOUS = "Suspicious"
    HIGH_RISK = "High Risk"
    CONFIRMED_THREAT = "Confirmed Threat"


class SimulationType(str, enum.Enum):
    CRYPTOMINING = "Cryptomining"
    NETWORK_FLOOD = "Network Flood"
    BRUTE_FORCE = "Brute Force"
    MALWARE = "Malware"
    DATA_EXFILTRATION = "Data Exfiltration"
    RANSOMWARE = "Ransomware"
    CUSTOM = "Custom"


# ─── Users ───────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    phone = Column(String(30), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=True)
    role = Column(String(50), default="analyst")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    first_login = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)

    audit_logs = relationship("AuditLog", back_populates="user")


# ─── System Info ─────────────────────────────────────────────────────

class SystemInfo(Base):
    __tablename__ = "system_info"

    id = Column(Integer, primary_key=True, autoincrement=True)
    hostname = Column(String(255))
    os_name = Column(String(100))
    os_version = Column(String(100))
    architecture = Column(String(50))
    cpu_model = Column(String(200))
    cpu_cores_physical = Column(Integer)
    cpu_cores_logical = Column(Integer)
    total_ram_gb = Column(Float)
    boot_time = Column(DateTime)
    collected_at = Column(DateTime, default=func.now())


# ─── Telemetry ───────────────────────────────────────────────────────

class Telemetry(Base):
    __tablename__ = "telemetry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=func.now(), index=True)

    # CPU
    cpu_percent = Column(Float)
    cpu_per_core = Column(JSON)  # list of per-core percentages
    cpu_freq_current = Column(Float)
    cpu_freq_max = Column(Float)
    cpu_load_1m = Column(Float)
    cpu_load_5m = Column(Float)
    cpu_load_15m = Column(Float)

    # Memory
    ram_total = Column(Float)  # bytes
    ram_used = Column(Float)
    ram_available = Column(Float)
    ram_percent = Column(Float)
    swap_total = Column(Float)
    swap_used = Column(Float)
    swap_percent = Column(Float)

    # Disk
    disk_partitions = Column(JSON)  # list of partition usage
    disk_read_bytes = Column(Float)
    disk_write_bytes = Column(Float)
    disk_read_rate = Column(Float)  # bytes/sec
    disk_write_rate = Column(Float)

    # Network
    net_bytes_sent = Column(Float)
    net_bytes_recv = Column(Float)
    net_upload_rate = Column(Float)  # bytes/sec
    net_download_rate = Column(Float)
    net_packets_sent = Column(Float)
    net_packets_recv = Column(Float)
    net_connections_count = Column(Integer)

    # Temperature
    cpu_temp = Column(Float, nullable=True)
    gpu_temp = Column(Float, nullable=True)

    # Battery
    battery_percent = Column(Float, nullable=True)
    battery_charging = Column(Boolean, nullable=True)
    battery_time_remaining = Column(Float, nullable=True)

    # System
    uptime_seconds = Column(Float)
    process_count = Column(Integer)
    active_users = Column(Integer)

    # Flags
    is_simulation = Column(Boolean, default=False)

    __table_args__ = (
        Index("idx_telemetry_timestamp_sim", "timestamp", "is_simulation"),
    )


# ─── Process Snapshots ──────────────────────────────────────────────

class ProcessSnapshot(Base):
    __tablename__ = "process_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=func.now(), index=True)
    pid = Column(Integer, nullable=False)
    name = Column(String(255))
    exe_path = Column(Text, nullable=True)
    cmdline = Column(Text, nullable=True)
    parent_pid = Column(Integer, nullable=True)
    parent_name = Column(String(255), nullable=True)
    cpu_percent = Column(Float)
    memory_percent = Column(Float)
    memory_rss = Column(Float)  # bytes
    num_threads = Column(Integer)
    status = Column(String(50))
    create_time = Column(DateTime, nullable=True)
    username = Column(String(100), nullable=True)
    net_connections_count = Column(Integer, default=0)
    exe_hash = Column(String(64), nullable=True)
    is_suspicious = Column(Boolean, default=False)
    anomaly_score = Column(Float, nullable=True)
    is_simulation = Column(Boolean, default=False)

    __table_args__ = (
        Index("idx_process_ts_pid", "timestamp", "pid"),
        Index("idx_process_name", "name"),
    )


# ─── Network Connections ────────────────────────────────────────────

class NetworkConnection(Base):
    __tablename__ = "network_connections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=func.now(), index=True)
    pid = Column(Integer, nullable=True)
    process_name = Column(String(255), nullable=True)
    local_address = Column(String(100))
    local_port = Column(Integer)
    remote_address = Column(String(100), nullable=True)
    remote_port = Column(Integer, nullable=True)
    protocol = Column(String(10))  # tcp, udp, tcp6, udp6
    status = Column(String(50))
    bytes_sent = Column(Float, nullable=True)
    bytes_recv = Column(Float, nullable=True)
    is_suspicious = Column(Boolean, default=False)
    anomaly_score = Column(Float, nullable=True)
    threat_intel_status = Column(String(50), nullable=True)
    is_simulation = Column(Boolean, default=False)

    __table_args__ = (
        Index("idx_netconn_remote", "remote_address"),
        Index("idx_netconn_ts", "timestamp"),
    )


# ─── Authentication Events ──────────────────────────────────────────

class AuthenticationEvent(Base):
    __tablename__ = "authentication_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=func.now(), index=True)
    event_type = Column(String(50))  # login_success, login_failure, logout
    username = Column(String(100))
    source = Column(String(200), nullable=True)  # local, remote, IP
    method = Column(String(50), nullable=True)  # console, ssh, rdp
    success = Column(Boolean)
    failure_reason = Column(String(200), nullable=True)
    is_suspicious = Column(Boolean, default=False)
    is_simulation = Column(Boolean, default=False)

    __table_args__ = (
        Index("idx_auth_ts_type", "timestamp", "event_type"),
    )


# ─── Security Events ────────────────────────────────────────────────

class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=func.now(), index=True)
    event_type = Column(String(100))
    severity = Column(String(20))  # Informational, Low, Moderate, High, Critical
    title = Column(String(500))
    description = Column(Text)
    evidence = Column(JSON)  # dict of evidence
    source_component = Column(String(100))  # which engine produced it
    related_pid = Column(Integer, nullable=True)
    related_process = Column(String(255), nullable=True)
    related_ip = Column(String(100), nullable=True)
    risk_contribution = Column(Float, nullable=True)
    is_simulation = Column(Boolean, default=False)


# ─── ML Results ──────────────────────────────────────────────────────

class MLResult(Base):
    __tablename__ = "ml_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=func.now(), index=True)

    # Individual model scores (normalized 0-1)
    isolation_forest_score = Column(Float, nullable=True)
    ocsvm_score = Column(Float, nullable=True)
    autoencoder_score = Column(Float, nullable=True)
    autoencoder_reconstruction_error = Column(Float, nullable=True)
    kmeans_cluster = Column(Integer, nullable=True)
    kmeans_cluster_label = Column(String(50), nullable=True)
    kmeans_distance = Column(Float, nullable=True)

    # Ensemble
    ensemble_score = Column(Float, nullable=True)
    anomaly_detected = Column(Boolean, default=False)

    # Model metadata
    model_version = Column(String(50), nullable=True)
    features_used = Column(JSON, nullable=True)
    is_simulation = Column(Boolean, default=False)


# ─── Risk Scores ─────────────────────────────────────────────────────

class RiskScore(Base):
    __tablename__ = "risk_scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=func.now(), index=True)
    overall_score = Column(Integer)  # 0-100
    risk_level = Column(String(20))

    # Contributors
    ml_contribution = Column(Float, default=0)
    baseline_contribution = Column(Float, default=0)
    process_contribution = Column(Float, default=0)
    network_contribution = Column(Float, default=0)
    auth_contribution = Column(Float, default=0)
    heuristic_contribution = Column(Float, default=0)
    threat_intel_contribution = Column(Float, default=0)
    normal_reduction = Column(Float, default=0)

    # Explanation
    explanation = Column(JSON)  # list of {factor, contribution, evidence}
    classification = Column(String(50))  # BehaviorClassification value

    is_simulation = Column(Boolean, default=False)

    __table_args__ = (
        Index("idx_risk_ts_level", "timestamp", "risk_level"),
    )


# ─── Alerts ──────────────────────────────────────────────────────────

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=func.now(), index=True)
    severity = Column(String(20))
    risk_score = Column(Integer)
    title = Column(String(500))
    description = Column(Text)
    evidence = Column(JSON)
    affected_pid = Column(Integer, nullable=True)
    affected_process = Column(String(255), nullable=True)
    network_evidence = Column(JSON, nullable=True)
    ml_evidence = Column(JSON, nullable=True)
    recommended_actions = Column(JSON, nullable=True)
    status = Column(String(20), default="New")
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    is_simulation = Column(Boolean, default=False)

    __table_args__ = (
        Index("idx_alert_status", "status"),
        Index("idx_alert_severity", "severity"),
    )


# ─── Threat Intelligence ────────────────────────────────────────────

class ThreatIntelligence(Base):
    __tablename__ = "threat_intelligence"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=func.now())
    indicator_type = Column(String(20))  # ip, domain, url, hash
    indicator_value = Column(String(500), index=True)
    source = Column(String(50))  # demo, virustotal, abuseipdb
    is_malicious = Column(Boolean, nullable=True)
    confidence = Column(Float, nullable=True)
    details = Column(JSON, nullable=True)
    tags = Column(JSON, nullable=True)
    cached_until = Column(DateTime, nullable=True)


# ─── Baseline Profiles ──────────────────────────────────────────────

class BaselineProfile(Base):
    __tablename__ = "baseline_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    context = Column(String(50), default="general")  # idle, normal_work, heavy, etc.
    sample_count = Column(Integer, default=0)
    is_trusted = Column(Boolean, default=False)
    confidence = Column(Float, default=0.0)

    # Statistical baseline for each metric
    metrics = Column(JSON)  # dict of {metric: {mean, std, min, max, p25, p50, p75, p95}}


# ─── Simulation Sessions ────────────────────────────────────────────

class SimulationSession(Base):
    __tablename__ = "simulation_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    started_at = Column(DateTime, default=func.now())
    ended_at = Column(DateTime, nullable=True)
    simulation_type = Column(String(50))
    parameters = Column(JSON)
    results_summary = Column(JSON, nullable=True)
    alerts_generated = Column(Integer, default=0)
    max_risk_score = Column(Integer, default=0)


# ─── Simulation Events ──────────────────────────────────────────────

class SimulationEvent(Base):
    __tablename__ = "simulation_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("simulation_sessions.id"), index=True)
    timestamp = Column(DateTime, default=func.now())
    event_type = Column(String(100))
    description = Column(Text)
    simulated_data = Column(JSON)

    session = relationship("SimulationSession")


# ─── Incidents ───────────────────────────────────────────────────────

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    title = Column(String(500))
    description = Column(Text)
    severity = Column(String(20))
    status = Column(String(20), default="Open")  # Open, Investigating, Resolved, Closed
    related_alerts = Column(JSON)  # list of alert IDs
    timeline = Column(JSON)  # list of timeline events
    evidence_summary = Column(JSON)
    assigned_to = Column(String(100), nullable=True)
    resolution = Column(Text, nullable=True)


# ─── Audit Logs ──────────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=func.now(), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100))
    details = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)

    user = relationship("User", back_populates="audit_logs")
