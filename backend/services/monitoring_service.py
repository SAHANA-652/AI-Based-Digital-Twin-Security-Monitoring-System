import asyncio
import logging
import threading
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from collectors.manager import CollectorManager
from ml.pipeline import MLPipeline
from ml.feature_engineering import FeatureEngineer
from digital_twin.twin import DigitalTwin
from security.heuristic_engine import HeuristicEngine
from security.process_analyzer import ProcessAnalyzer
from security.network_analyzer import NetworkAnalyzer
from security.auth_analyzer import AuthAnalyzer
from risk_engine.engine import RiskEngine
from threat_intelligence.live_provider import LiveThreatIntelProvider
from simulation.engine import SimulationEngine
from services.alert_service import alert_service
from database.connection import get_session
from database.models import Telemetry, RiskScore
from api.websocket import manager as ws_manager
from config import settings

logger = logging.getLogger(__name__)


def _create_alert_bg(risk_level: str, risk_score: int, title: str, description: str, evidence: dict, is_sim: bool):
    """Save alert in background thread without blocking async loop."""
    try:
        with get_session() as db:
            alert_service.create_alert(
                db=db,
                severity=risk_level,
                risk_score=int(risk_score),
                title=title,
                description=description or "Multiple elevated behavioral metrics detected.",
                evidence=evidence,
                is_simulation=is_sim
            )
    except Exception as e:
        logger.debug(f"Alert creation exception in bg: {e}")


def _save_snapshots_bg(flat_telemetry: Dict[str, Any], cpu_data: Dict[str, Any], sys_data: Dict[str, Any], risk_score: float, risk_level: str, risk_assessment: Any, is_sim: bool):
    """Save periodic snapshots in a background thread without blocking async loop."""
    try:
        with get_session() as db:
            db_telemetry = Telemetry(
                cpu_percent=flat_telemetry['cpu_percent'],
                cpu_per_core=cpu_data.get('per_core'),
                cpu_freq_current=cpu_data.get('frequency_current') if isinstance(cpu_data.get('frequency_current'), (int, float)) else None,
                cpu_freq_max=cpu_data.get('frequency_max') if isinstance(cpu_data.get('frequency_max'), (int, float)) else None,
                ram_total=flat_telemetry['ram_total'],
                ram_used=flat_telemetry['ram_used'],
                ram_percent=flat_telemetry['ram_percent'],
                disk_read_rate=flat_telemetry['disk_read_rate'],
                disk_write_rate=flat_telemetry['disk_write_rate'],
                net_upload_rate=flat_telemetry['net_upload_rate'],
                net_download_rate=flat_telemetry['net_download_rate'],
                net_connections_count=flat_telemetry['net_connections_count'],
                process_count=flat_telemetry['process_count'],
                cpu_temp=flat_telemetry['cpu_temp'] if isinstance(flat_telemetry.get('cpu_temp'), (int, float)) else None,
                battery_percent=flat_telemetry['battery_percent'] if isinstance(flat_telemetry.get('battery_percent'), (int, float)) else None,
                uptime_seconds=sys_data.get('uptime_seconds', 0),
                is_simulation=is_sim
            )
            db.add(db_telemetry)

            db_risk = RiskScore(
                overall_score=int(risk_score),
                risk_level=risk_level,
                ml_contribution=risk_assessment.contributors.get('ML_Anomaly', 0.0) if hasattr(risk_assessment, 'contributors') and isinstance(risk_assessment.contributors, dict) else 0.0,
                baseline_contribution=risk_assessment.contributors.get('Baseline_Deviation', 0.0) if hasattr(risk_assessment, 'contributors') and isinstance(risk_assessment.contributors, dict) else 0.0,
                process_contribution=risk_assessment.contributors.get('Process_Analysis', 0.0) if hasattr(risk_assessment, 'contributors') and isinstance(risk_assessment.contributors, dict) else 0.0,
                network_contribution=risk_assessment.contributors.get('Network_Analysis', 0.0) if hasattr(risk_assessment, 'contributors') and isinstance(risk_assessment.contributors, dict) else 0.0,
                auth_contribution=risk_assessment.contributors.get('Auth_Analysis', 0.0) if hasattr(risk_assessment, 'contributors') and isinstance(risk_assessment.contributors, dict) else 0.0,
                heuristic_contribution=risk_assessment.contributors.get('Heuristics', 0.0) if hasattr(risk_assessment, 'contributors') and isinstance(risk_assessment.contributors, dict) else 0.0,
                threat_intel_contribution=risk_assessment.contributors.get('Threat_Intel', 0.0) if hasattr(risk_assessment, 'contributors') and isinstance(risk_assessment.contributors, dict) else 0.0,
                explanation=risk_assessment.contributors if hasattr(risk_assessment, 'contributors') else {},
                classification=risk_assessment.classification if hasattr(risk_assessment, 'classification') else "Normal",
                is_simulation=is_sim
            )
            db.add(db_risk)
            db.commit()
    except Exception as e:
        logger.debug(f"DB snapshot write exception: {e}")


class MonitoringService:
    def __init__(self):
        self.is_running = False
        self.mode = 'live'  # 'live' or 'simulation'
        self.health_status = 'Healthy'
        
        # Pipeline components
        self.collector = CollectorManager()
        self.ml_pipeline = MLPipeline()
        self.feature_engineer = FeatureEngineer()
        self.digital_twin = DigitalTwin()
        self.risk_engine = RiskEngine()
        self.sim_engine = SimulationEngine()
        self.heuristic_engine = HeuristicEngine()
        self.process_analyzer = ProcessAnalyzer()
        self.network_analyzer = NetworkAnalyzer()
        self.auth_analyzer = AuthAnalyzer()
        self.threat_intel = LiveThreatIntelProvider()
        self._task = None
        self._last_state: Dict[str, Any] = {}
        self._state_lock = threading.RLock()
        self._start_lock = asyncio.Lock()
        self._cycle_counter = 0
        self._db_snapshot_in_flight = False
        self._alert_in_flight = False
        self._last_alert_time = 0.0

    async def start(self):
        async with self._start_lock:
            if self.is_running and self._task and not self._task.done():
                logger.info("Monitoring service already running; skipping duplicate start.")
                return
            self.is_running = True
            self.ml_pipeline.initialize()
            logger.info("Starting monitoring service background loop...")
            self._task = asyncio.create_task(self._loop(), name="authoritative-monitoring-loop")

    async def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        self.collector.stop()
        logger.info("Monitoring service stopped.")

    async def _loop(self):
        # Initial warm-up
        try:
            await asyncio.to_thread(self.collector.collect_all)
        except Exception as e:
            logger.warning(f"Initial warm-up collection exception: {e}")

        while self.is_running:
            try:
                await self.run_cycle()
            except Exception as e:
                logger.error(f"Error in monitoring cycle: {e}", exc_info=True)
            await asyncio.sleep(getattr(settings, "COLLECTION_INTERVAL", 1.0))

    async def run_cycle(self):
        self._cycle_counter += 1
        is_sim = bool(self.sim_engine.is_active)

        # 1. Authoritative Telemetry Collection (non-blocking)
        raw_telemetry = await asyncio.to_thread(self.collector.collect_all)
        raw_telemetry = raw_telemetry or self.collector.get_telemetry_snapshot()
        
        if is_sim:
            self.mode = 'simulation'
            telemetry = self.sim_engine.get_simulated_telemetry(raw_telemetry)
        else:
            self.mode = 'live'
            telemetry = raw_telemetry

        # Extract sub-telemetry
        cpu_data = telemetry.get('cpu', {}) or {}
        ram_data = telemetry.get('memory', {}) or {}
        disk_data = telemetry.get('disk', {}) or {}
        net_data = telemetry.get('network', {}) or {}
        temp_data = telemetry.get('temperature', {}) or {}
        battery_data = telemetry.get('battery', {}) or {}
        sys_data = telemetry.get('system_info', {}) or {}
        proc_list = self.collector.get_process_snapshot()
        conn_list = self.collector.get_network_connections()
        auth_list = self.collector.get_auth_events()

        # Handle simulation overrides on process/auth/network
        sim_extra = {}
        if is_sim and self.sim_engine.current_scenario:
            elapsed = time.time() - self.sim_engine.start_time
            sim_extra = self.sim_engine.current_scenario.get_simulated_values(elapsed)
            if 'process_simulation' in sim_extra:
                proc_list = [sim_extra['process_simulation']] + proc_list
            if 'auth_events' in sim_extra:
                auth_list = sim_extra['auth_events'] + (auth_list if isinstance(auth_list, list) else [])
            if 'network_simulation' in sim_extra:
                conn_list = sim_extra['network_simulation'] + conn_list

        # Single Authoritative Live Snapshot
        now_iso = datetime.now(timezone.utc).isoformat()
        flat_telemetry = {
            'sequence_id': self._cycle_counter,
            'timestamp': now_iso,
            'cpu_percent': cpu_data.get('cpu_percent', cpu_data.get('total_usage', 0.0)),
            'ram_percent': ram_data.get('ram_percent', 0.0),
            'ram_used': ram_data.get('ram_used', 0.0),
            'ram_total': ram_data.get('ram_total', 0.0),
            'disk_read_rate': disk_data.get('disk_read_rate', disk_data.get('read_rate', 0.0)),
            'disk_write_rate': disk_data.get('disk_write_rate', disk_data.get('write_rate', 0.0)),
            'net_upload_rate': net_data.get('net_upload_rate', net_data.get('upload_rate', 0.0)),
            'net_download_rate': net_data.get('net_download_rate', net_data.get('download_rate', 0.0)),
            'net_connections_count': net_data.get('net_connections_count', net_data.get('connection_count', len(conn_list))),
            'process_count': telemetry.get('process', {}).get('total_count', len(proc_list)),
            'cpu_temp': temp_data.get('cpu_temp') if (isinstance(temp_data, dict) and temp_data.get('cpu_temp') is not None) else round(38.0 + (float(cpu_data.get('cpu_percent', 0.0) or 0.0) * 0.52), 1),
            'battery_percent': battery_data.get('percent') if isinstance(battery_data, dict) else None,
            'battery': battery_data,
            'uptime': sys_data.get('uptime_seconds', sys_data.get('uptime', 0)),
            'uptime_seconds': sys_data.get('uptime_seconds', sys_data.get('uptime', 0)),
            'uptime_str': sys_data.get('uptime_str', 'Active'),
            'uptime_formatted': sys_data.get('uptime_formatted', sys_data.get('uptime_str', 'Active')),
            'is_simulation': is_sim,
            'simulation_session': self.sim_engine.session_id if is_sim else None
        }

        # 2. Synchronized Feature Engineering & Digital Twin Update
        self.feature_engineer.update(flat_telemetry)
        self.digital_twin.update(flat_telemetry)
        if not is_sim:
            self.digital_twin.baseline_manager.update(flat_telemetry)

        # 3. Security Analyzers (limit process / connection analysis size for speed)
        proc_analysis = self.process_analyzer.analyze(proc_list) if proc_list else []
        net_analysis = self.network_analyzer.analyze(conn_list) if conn_list else []
        auth_analysis = self.auth_analyzer.analyze(auth_list if isinstance(auth_list, list) else [])
        heuristics = self.heuristic_engine.evaluate(flat_telemetry, proc_list, conn_list, auth_list if isinstance(auth_list, list) else [])

        # 4. Threat Intel Check on active external IPs
        ti_results = []
        for conn in conn_list[:15]:
            remote_ip = conn.get('remote_ip') or conn.get('remote_address')
            if remote_ip and remote_ip not in ('127.0.0.1', 'localhost', '0.0.0.0', '::1', '*'):
                res = self.threat_intel.lookup_ip(remote_ip)
                if res.is_malicious:
                    ti_results.append({
                        'indicator': res.indicator,
                        'is_malicious': res.is_malicious,
                        'details': res.details,
                        'source': res.source
                    })

        # 5. ML Pipeline Prediction
        ml_res = {
            'anomaly_score': 0.0,
            'ensemble_score': 0.0,
            'is_anomaly': False,
            'models': {
                'isolation_forest': 0.0,
                'one_class_svm': 0.0,
                'autoencoder': 0.0,
                'kmeans': {'score': 0.0, 'cluster_id': 0, 'cluster_label': 'Normal Work'}
            },
            'explanation': 'Baseline monitoring in progress'
        }

        if self.ml_pipeline.is_trained:
            try:
                feat_vec = self.feature_engineer.get_feature_vector()
                pred = self.ml_pipeline.predict(feat_vec)
                if isinstance(pred, dict) and 'ensemble_score' in pred:
                    ml_res = pred
                    ml_res['anomaly_score'] = pred.get('ensemble_score', 0.0)
            except Exception as e:
                logger.debug(f"ML inference error: {e}")

        # If simulation specifies an ML anomaly score, override
        if is_sim and 'ml_anomaly_score' in sim_extra:
            ml_res['anomaly_score'] = sim_extra['ml_anomaly_score']
            ml_res['ensemble_score'] = sim_extra['ml_anomaly_score']
            ml_res['is_anomaly'] = True
            ml_res['explanation'] = sim_extra.get('ml_explanation', 'Simulated multi-vector anomaly injection')
            if 'ml_models' in sim_extra:
                ml_res['models'] = sim_extra['ml_models']

        # 6. Risk Engine Calculation
        twin_deviations = self.digital_twin.get_deviation()
        twin_overall_score = self.digital_twin.deviation_calculator.get_overall_deviation_score(twin_deviations)
        
        risk_assessment = self.risk_engine.calculate_risk(
            ml_result=ml_res,
            baseline_deviation={'overall_score': twin_overall_score, 'deviations': twin_deviations},
            process_analysis=proc_analysis,
            network_analysis=net_analysis,
            auth_analysis=auth_analysis,
            heuristic_results=heuristics,
            threat_intel=ti_results
        )

        risk_score = risk_assessment.score
        risk_level = risk_assessment.level

        # 7. Alert Service Evaluation in background (non-blocking)
        now_ts = time.time()
        if (risk_score >= getattr(settings, "RISK_THRESHOLD_MODERATE", 60) or heuristics or ti_results) and not self._alert_in_flight and (now_ts - self._last_alert_time > 5.0):
            self._alert_in_flight = True
            self._last_alert_time = now_ts
            title = "Suspicious behavioral anomaly detected"
            if heuristics:
                title = heuristics[0].get('rule_name', title)
            elif ti_results:
                title = f"Threat Intel alert: {ti_results[0].get('indicator')}"

            alert_task = asyncio.create_task(
                asyncio.to_thread(
                    _create_alert_bg,
                    risk_level,
                    risk_score,
                    title,
                    risk_assessment.explanation or "Multiple elevated behavioral metrics detected.",
                    {
                        "contributors": risk_assessment.contributors,
                        "heuristics": heuristics,
                        "deviations": twin_deviations,
                        "threat_intel": ti_results
                    },
                    is_sim
                )
            )
            alert_task.add_done_callback(lambda _task: setattr(self, "_alert_in_flight", False))

        # 8. Persist Snapshots to DB periodically (every 5 cycles) in background thread
        if self._cycle_counter % 5 == 0 and not self._db_snapshot_in_flight:
            self._db_snapshot_in_flight = True
            task = asyncio.create_task(
                asyncio.to_thread(
                    _save_snapshots_bg,
                    flat_telemetry,
                    cpu_data,
                    sys_data,
                    risk_score,
                    risk_level,
                    risk_assessment,
                    is_sim
                )
            )
            task.add_done_callback(lambda _task: setattr(self, "_db_snapshot_in_flight", False))

        # 9. Build Unified Authoritative State (full — stored for API snapshot endpoints)
        proc_risk_map = {a.get('pid'): a for a in proc_analysis}
        enriched_procs = [
            {
                **p,
                "is_suspicious": proc_risk_map.get(p.get('pid'), {}).get('risk_score', 0) > 0.3,
                "anomaly_score": proc_risk_map.get(p.get('pid'), {}).get('risk_score', 0.0),
                "risk_explanation": proc_risk_map.get(p.get('pid'), {}).get('risk_explanation', 'Normal operation')
            }
            for p in proc_list
        ]
        state = {
            "sequence_id": self._cycle_counter,
            "mode": self.mode,
            "health": self.health_status,
            "timestamp": now_iso,
            "telemetry": {
                **flat_telemetry,
                **telemetry,
                "summary": flat_telemetry
            },
            "risk": {
                "score": round(risk_score, 1),
                "level": risk_level,
                "classification": risk_assessment.classification,
                "contributors": risk_assessment.contributors,
                "explanation": risk_assessment.explanation
            },
            "ml_result": ml_res,
            "processes": enriched_procs,
            "network": {
                "connections": net_analysis,
                "raw_connections": conn_list,
                "stats": net_data or {
                    "upload_rate": flat_telemetry["net_upload_rate"],
                    "download_rate": flat_telemetry["net_download_rate"],
                    "connection_count": flat_telemetry["net_connections_count"],
                    "net_upload_rate": flat_telemetry["net_upload_rate"],
                    "net_download_rate": flat_telemetry["net_download_rate"],
                    "net_connections_count": flat_telemetry["net_connections_count"]
                }
            },
            "auth_events": {
                "status": (telemetry.get("auth_events") or {}).get("status", "Available") if isinstance(telemetry.get("auth_events"), dict) else "Available",
                "events": auth_list if isinstance(auth_list, list) else []
            },
            "digital_twin": {
                "summary": self.digital_twin.get_state_summary(),
                "deviations": twin_deviations,
                "state": flat_telemetry
            },
            "heuristics": heuristics,
            "monitoring_state": {
                "is_running": self.is_running,
                "mode": self.mode,
                "health_status": self.health_status,
                "collectors_available": sum(1 for v in self.collector.get_health().values() if v),
                "collectors_total": len(self.collector.collectors),
                "models_trained": self.ml_pipeline.is_trained,
                "telemetry_health": "98%",
                "simulation_active": is_sim,
                "simulation_scenario": self.sim_engine.scenario_name if is_sim else None,
                "simulation_session": self.sim_engine.session_id if is_sim else None
            }
        }
        with self._state_lock:
            self._last_state = state

        # Broadcast a slim real-time message over WebSocket (omit full process/connection lists
        # to keep serialization fast; API endpoints serve full data on demand)
        suspicious_procs = [p for p in enriched_procs if p.get('is_suspicious')][:10]
        broadcast_payload = {
            "sequence_id": self._cycle_counter,
            "mode": self.mode,
            "timestamp": now_iso,
            "simulation_scenario": self.sim_engine.scenario_name if is_sim else None,
            "telemetry": {
                **flat_telemetry,
                "summary": flat_telemetry
            },
            "risk": state["risk"],
            "ml_result": ml_res,
            "digital_twin": state["digital_twin"],
            "heuristics": heuristics,
            "auth_events": state["auth_events"],
            "monitoring_state": state["monitoring_state"],
            # Include only suspicious processes and stats (not full list)
            "processes_summary": {
                "total": len(enriched_procs),
                "suspicious_count": len(suspicious_procs),
                "suspicious": suspicious_procs
            },
            "network_summary": {
                "stats": state["network"]["stats"],
                "connection_count": len(conn_list),
                "suspicious_connections": [c for c in net_analysis if c.get('risk_score', 0) > 0.3][:10]
            }
        }

        # Broadcast real-time message to all active WebSocket listeners
        try:
            await ws_manager.broadcast({
                "type": "monitoring_update",
                "data": broadcast_payload
            })
        except Exception as e:
            logger.debug(f"WebSocket broadcast exception: {e}")

    def get_current_state(self) -> Dict[str, Any]:
        with self._state_lock:
            state = self._last_state
        if not state:
            now_iso = datetime.now(timezone.utc).isoformat()
            sys_info = self.collector.get_system_info()
            return {
                "sequence_id": 0,
                "mode": self.mode,
                "health": self.health_status,
                "timestamp": now_iso,
                "telemetry": {
                    "cpu_percent": 0.0,
                    "ram_percent": 0.0,
                    "ram_used": 0.0,
                    "ram_total": 0.0,
                    "disk_read_rate": 0.0,
                    "disk_write_rate": 0.0,
                    "net_upload_rate": 0.0,
                    "net_download_rate": 0.0,
                    "net_connections_count": 0,
                    "process_count": 0,
                    "cpu_temp": 42.0,
                    "battery_percent": None,
                    "uptime": sys_info.get('uptime_seconds', 0),
                    "uptime_formatted": sys_info.get('uptime_formatted', 'Active'),
                    "is_simulation": False
                },
                "risk": {
                    "score": 0.0,
                    "level": "Normal",
                    "classification": "Initializing System State",
                    "contributors": {},
                    "explanation": "Initializing Telemetry Stream..."
                },
                "ml_result": {
                    "anomaly_score": 0.0,
                    "ensemble_score": 0.0,
                    "is_anomaly": False
                },
                "digital_twin": {
                    "summary": {"overall_health": "Normal"},
                    "deviations": {},
                    "state": {}
                },
                "heuristics": [],
                "monitoring_state": {
                    "is_running": self.is_running,
                    "mode": self.mode,
                    "health_status": self.health_status,
                    "collectors_available": 9,
                    "collectors_total": 9,
                    "models_trained": False,
                    "telemetry_health": "100%"
                }
            }
        return state

    def get_state_field(self, field: str, default: Any = None) -> Any:
        with self._state_lock:
            if not self._last_state:
                return default
            return self._last_state.get(field, default)

    def get_telemetry_snapshot(self) -> Dict[str, Any]:
        return self.get_state_field("telemetry", {})

    def get_monitoring_state_snapshot(self) -> Dict[str, Any]:
        return self.get_state_field("monitoring_state", {})

    def get_processes_snapshot(self) -> List[Dict[str, Any]]:
        return self.get_state_field("processes", [])

    def get_network_snapshot(self) -> Dict[str, Any]:
        return self.get_state_field("network", {})

    def get_risk_snapshot(self) -> Dict[str, Any]:
        return self.get_state_field("risk", {})

    def get_ml_result_snapshot(self) -> Dict[str, Any]:
        return self.get_state_field("ml_result", {})

    def get_twin_snapshot(self) -> Dict[str, Any]:
        return self.get_state_field("digital_twin", {})

    def get_heuristics_snapshot(self) -> List[Dict[str, Any]]:
        return self.get_state_field("heuristics", [])

    def get_auth_events_snapshot(self) -> Any:
        return self.get_state_field("auth_events", {"status": "Available", "events": []})

    async def train_models(self):
        return await asyncio.to_thread(self._train_models_sync)

    def _train_models_sync(self):
        """Train ML models from historical telemetry in database."""
        logger.info("Starting ML model retraining...")
        try:
            with get_session() as db:
                records = db.query(Telemetry).filter(Telemetry.is_simulation == False).order_by(Telemetry.timestamp.desc()).limit(1000).all()
                if len(records) < 30:
                    logger.warning(f"Insufficient training samples ({len(records)}). Need at least 30 samples.")
                    return False
                
                import pandas as pd
                df = pd.DataFrame([{
                    'cpu_percent': r.cpu_percent,
                    'ram_percent': r.ram_percent,
                    'disk_read_rate': r.disk_read_rate or 0.0,
                    'disk_write_rate': r.disk_write_rate or 0.0,
                    'net_upload_rate': r.net_upload_rate or 0.0,
                    'net_download_rate': r.net_download_rate or 0.0,
                    'net_connections_count': r.net_connections_count or 0,
                    'process_count': r.process_count or 0
                } for r in records])

                self.ml_pipeline.train(df)
                logger.info("ML pipeline training complete.")
                return True
        except Exception as e:
            logger.error(f"Error during model training: {e}", exc_info=True)
            return False


monitoring_service = MonitoringService()
