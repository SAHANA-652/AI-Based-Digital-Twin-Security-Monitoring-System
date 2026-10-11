from sqlalchemy.orm import Session
from database.models import Alert
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List


class AlertService:
    def create_alert(
        self,
        db: Session,
        severity: str,
        risk_score: int,
        title: str,
        description: str,
        evidence: Optional[Dict[str, Any]] = None,
        affected_pid: Optional[int] = None,
        affected_process: Optional[str] = None,
        network_evidence: Optional[Any] = None,
        ml_evidence: Optional[Any] = None,
        recommended_actions: Optional[List[str]] = None,
        is_simulation: bool = False
    ) -> Alert:
        # Dedup check - don't spam alerts for same title within 10 mins
        now = datetime.now(timezone.utc)
        ten_mins_ago = now - timedelta(minutes=10)
        
        recent_alert = db.query(Alert).filter(
            Alert.title == title,
            Alert.status == "New",
            Alert.timestamp >= ten_mins_ago
        ).first()
        
        if recent_alert:
            return recent_alert
            
        alert = Alert(
            severity=severity,
            risk_score=risk_score,
            title=title,
            description=description,
            evidence=evidence,
            affected_pid=affected_pid,
            affected_process=affected_process,
            network_evidence=network_evidence,
            ml_evidence=ml_evidence,
            recommended_actions=recommended_actions or [
                "Inspect process hierarchy in Process Monitor",
                "Verify remote endpoints via Threat Intelligence",
                "Review baseline deviations in Digital Twin tab"
            ],
            status="New",
            timestamp=now,
            is_simulation=is_simulation
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return alert

    def get_alerts(self, db: Session, status_filter=None, severity_filter=None, limit=100, offset=0):
        query = db.query(Alert)
        if status_filter:
            query = query.filter(Alert.status == status_filter)
        if severity_filter:
            query = query.filter(Alert.severity == severity_filter)
        return query.order_by(Alert.timestamp.desc()).offset(offset).limit(limit).all()

    def update_alert_status(self, db: Session, alert_id, new_status, resolved_by=None, notes=None):
        alert = db.query(Alert).filter(Alert.id == alert_id).first()
        if alert:
            alert.status = new_status
            if resolved_by:
                alert.resolved_by = resolved_by
            if notes:
                alert.notes = notes
            if new_status in ("Resolved", "Ignored", "False Positive"):
                alert.resolved_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(alert)
        return alert

    def get_alert_detail(self, db: Session, alert_id):
        return db.query(Alert).filter(Alert.id == alert_id).first()


alert_service = AlertService()
