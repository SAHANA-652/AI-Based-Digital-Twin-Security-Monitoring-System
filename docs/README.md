# AI-Based Digital Twin Security Monitoring System

## Overview
The AI-Based Digital Twin Security Monitoring System provides real-time, context-aware anomaly detection and threat identification for endpoints. By building a continuous "Digital Twin" of the system's normal operational baseline, the engine intelligently flags deviations that indicate potential security risks while dramatically reducing false positives commonly seen in static heuristic systems.

## Architecture
- **Data Flow**: Telemetry → Processing → Machine Learning → Risk Engine → Dashboard
- **Components**:
  - **Collectors**: Gather CPU, RAM, Disk, Network, Process, and Auth data.
  - **Feature Engineering**: Calculates sliding windows, Z-scores, and prepares vectorized data.
  - **Digital Twin & Baseline**: Maintains historical state and context to assess deviations.
  - **Machine Learning Ensemble**: Uses Isolation Forest, One-Class SVM, Autoencoders, and K-Means clustering.
  - **Risk Engine**: Correlates weak signals and ML scores into a singular 0-100 severity index.
  - **Heuristics**: Deterministic rules for obvious threat behaviors (e.g., processes running from `/tmp/`).
  - **Dashboard**: React-based frontend mapping current system state against the twin.

## Installation
### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend Setup
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/macOS
# source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

**Default Credentials**: `admin` / `admin123`

## Supported Platforms
- **Windows**: Full support (Processes, Networking, Auth, Hardware).
- **Linux**: Full support.
- **macOS**: Partial support (some specific hardware temperature or deep auth sensors may be unavailable on this system).

## Telemetry Collection
- **CPU/Memory/Disk**: Uses `psutil` to track usage metrics and I/O.
- **Network**: Tracks active connections and bandwidth.
- **Processes**: Monitors executable paths, resource usage, and hierarchy.
- **System/Auth**: Monitors login attempts and session security. (Requires appropriate OS permissions; degrades gracefully if unavailable).

## Digital Twin Methodology
- **Learning**: Continuously builds a behavioral profile ("Baseline") from rolling telemetry samples.
- **Deviations**: Anomalies are measured strictly as statistical distances from the known Baseline.
- **Baseline Poisoning Protection**: The system rejects highly anomalous samples from being incorporated into the baseline.
- **Context-aware Adaptation**: Shifts baseline expectations depending on detected macro-states (e.g., Idle vs. Heavy Load).

## Machine Learning
The pipeline leverages an Unsupervised Ensemble approach:
- **Isolation Forest**: Efficient anomaly detection based on feature isolation.
- **One-Class SVM**: Defines a tight multidimensional boundary around normal states.
- **Autoencoder**: Neural network trained to reconstruct normal data; high reconstruction error implies anomalies.
- **K-Means**: Clusters behavioral contexts (e.g., "browsing", "compiling").
- **Ensemble**: Normalizes outputs from all models to yield a robust weighted score.
- **IMPORTANT**: Anomaly scores reflect statistical deviations, NOT malware probabilities.

## Risk Scoring
- **0-100 Scale**: Represents overall behavioral risk index.
- **Configuration**: Weights are adjustable per environment.
- **Correlation**: Multiple weak signals (e.g., high CPU + unfamiliar outbound IP) exponentially boost the score.
- **Explanation**: Generates human-readable breakdowns of top contributing factors.
- **Classification**: Informational (<20), Low (20-39), Moderate (40-59), High (60-79), Critical (80+).

## Security Heuristics
Deterministic checks acting as safety nets:
- `PROC_SUSPICIOUS_PATH`: Triggers if executables run from temporary/hidden directories.
- `PROC_HIGH_RESOURCE`: Flags processes consuming >80% sustained CPU.
- `AUTH_REPEATED_FAILURE`: Monitors brute-force login attempts.
- Include localized reasoning and specific evidence payload.

## Threat Intelligence
- **Live Mode**: Real-time integration with supported TI providers (e.g., VirusTotal, AbuseIPDB).
- **Demo Mode**: Simulates TI lookups for demonstrations without requiring API keys.

## Attack Simulation
A built-in module for testing defense capabilities:
- **Scenarios**: `CryptominingScenario`, `NetworkFloodScenario`, `BruteForceScenario`, `CustomScenario`.
- **Safety**: Virtualizes telemetry anomalies; does NOT alter real system performance or execute malicious payloads.
- **Flow**: Simulation data flows exactly through the standard detection pipeline (marked as `is_simulation`) to test alarms.

## Database
- **Schema**: Stores timeseries telemetry, alerts, and model metadata.
- **Retention**: Auto-purges raw telemetry > 30 days to conserve space.
- **Migration**: Uses SQLite by default. Compatible with PostgreSQL via SQLAlchemy.

## API Reference
- `GET /api/telemetry` - Fetch current system state.
- `POST /api/login` - JWT Authentication.
- `GET /api/alerts` - CRUD endpoints for managing threat alerts.
- `POST /api/simulation/start` - Initiate attack scenario.
- `POST /api/simulation/stop` - Halt attack scenario.
- Provides a WebSocket endpoint for real-time frontend streaming.

## Testing
Run the test suite from the `backend/` directory:
```bash
pytest tests/ -v
```
- **Categories**: Unit, Integration, and Data pipelines.
- **False Positives**: Specifically designed tests (e.g., `test_false_positives.py`) ensuring heavy but legitimate workloads (gaming, coding, large downloads) do not trigger Critical risk alerts.

## Limitations
- **Sensor Availability**: Hardware temperature/battery sensors may be "Unavailable on this system" depending on OS/Hardware.
- **OS Discrepancies**: Security events (Auth logs) differ fundamentally between Windows/Linux/macOS.
- **Not Antivirus**: Anomaly detection identifies strange behavior but does NOT prove the presence of malware.
- **Permissions**: Granular process details require Admin/root elevation.
- **False Positives**: Unsupervised ML can flag legitimate new user workflows if not tuned correctly.

## Future Scope
- **EDR/SIEM Integration**: Forwarding alerts to Splunk/CrowdStrike.
- **Fleet Monitoring**: Scaling from a single endpoint to distributed enterprise deployments.
- **Federated Learning**: Sharing model baselines securely across multiple nodes.

## License
MIT License
