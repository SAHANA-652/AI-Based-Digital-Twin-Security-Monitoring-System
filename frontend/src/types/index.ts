export interface TelemetryData {
  cpu_percent?: number;
  ram_percent?: number;
  ram_used?: number;
  ram_total?: number;
  disk_read_rate?: number;
  disk_write_rate?: number;
  net_upload_rate?: number;
  net_download_rate?: number;
  net_connections_count?: number;
  process_count?: number;
  cpu_temp?: number | null;
  battery_percent?: number | null;
  uptime_seconds?: number;
  is_simulation?: boolean;
  summary?: any;
  [key: string]: any;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  exe_path?: string;
  parent_pid?: number;
  parent_name?: string;
  cpu_percent?: number;
  memory_percent?: number;
  memory_rss?: number;
  status?: string;
  create_time?: string;
  username?: string;
  net_connections_count?: number;
  is_suspicious?: boolean;
  anomaly_score?: number;
  [key: string]: any;
}

export interface NetworkConnectionInfo {
  pid?: number;
  process_name?: string;
  local_address?: string;
  local_port?: number;
  remote_address?: string;
  remote_port?: number;
  protocol?: string;
  status?: string;
  is_suspicious?: boolean;
  anomaly_score?: number;
  threat_intel_status?: string;
  [key: string]: any;
}

export interface AuthEvent {
  timestamp: string;
  event_type: string;
  username: string;
  source?: string;
  method?: string;
  success?: boolean;
  failure_reason?: string;
  is_suspicious?: boolean;
}

export interface MetricDeviation {
  name: string;
  current: number;
  baseline: number;
  expected: number;
  deviation: number;
  status: 'Normal' | 'Elevated' | 'High' | 'Critical';
}

export interface DigitalTwinState {
  summary?: any;
  deviations?: Record<string, any>;
  current_state?: any;
  baseline_state?: any;
  expected_state?: any;
  [key: string]: any;
}

export interface MLResult {
  isolation_forest_score?: number;
  ocsvm_score?: number;
  autoencoder_score?: number;
  autoencoder_reconstruction_error?: number;
  kmeans_cluster?: number;
  kmeans_cluster_label?: string;
  kmeans_distance?: number;
  ensemble_score?: number;
  anomaly_detected?: boolean;
  model_version?: string;
  models?: any;
  explanation?: string;
  [key: string]: any;
}

export interface RiskContributor {
  factor?: string;
  contribution?: number;
  evidence?: string;
  [key: string]: any;
}

export interface RiskScore {
  score?: number;
  overall_score?: number;
  level?: string;
  risk_level?: string;
  classification?: string;
  contributors?: any;
  explanation?: string;
  [key: string]: any;
}

export interface Alert {
  id: number | string;
  timestamp: string;
  severity: string;
  risk_score: number;
  title: string;
  description: string;
  evidence?: any;
  affected_pid?: number;
  affected_process?: string;
  network_evidence?: any;
  ml_evidence?: any;
  recommended_actions?: string[];
  status?: string;
  is_simulation?: boolean;
  notes?: string;
}

export interface ThreatIntelResult {
  indicator: string;
  type: string;
  source: string;
  is_malicious: boolean;
  confidence: number;
  details: string;
  tags?: string[];
}

export interface SimulationStatus {
  is_active: boolean;
  scenario_type?: string;
  session_id?: string;
  parameters?: Record<string, any>;
  elapsed_seconds?: number;
  mode?: string;
}

export interface SystemInfo {
  hostname?: string;
  os_name?: string;
  os_version?: string;
  architecture?: string;
  cpu_model?: string;
  cpu_cores_physical?: number;
  cpu_cores_logical?: number;
  total_ram_gb?: number;
  boot_time?: string;
  uptime?: number;
}

export interface MonitoringState {
  is_running?: boolean;
  mode?: 'LIVE' | 'SIMULATION' | 'DEGRADED' | string;
  health_status?: 'healthy' | 'degraded' | 'critical' | string;
  collectors_available?: number;
  collectors_total?: number;
  models_trained?: boolean;
  telemetry_health?: string | number;
}

export interface DashboardData {
  mode?: string;
  health?: string;
  timestamp?: string;
  telemetry?: TelemetryData;
  digital_twin?: DigitalTwinState;
  risk?: RiskScore;
  risk_score?: RiskScore;
  ml_result?: MLResult;
  heuristics?: any[];
  monitoring_state?: MonitoringState;
  alerts_count?: number;
  [key: string]: any;
}

export interface User {
  id?: string;
  username: string;
  full_name?: string;
  role?: string;
}
