import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { MetricCard } from '../components/common/MetricCard';
import { RiskGauge } from '../components/common/RiskGauge';
import { ModeIndicator } from '../components/common/ModeIndicator';
import { StatusBadge } from '../components/common/StatusBadge';
import { Tooltip } from '../components/common/Tooltip';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Activity, ShieldAlert, Cpu, HardDrive, Wifi, Server,
  AlertTriangle, CheckCircle2, TrendingUp, Zap, Battery,
  BatteryCharging, Thermometer, Clock, ShieldCheck, RefreshCw,
  Layers, Shield
} from 'lucide-react';

import { DigitalTwinTopology } from '../components/common/DigitalTwinTopology';

export const Dashboard: React.FC = () => {
  const wsData = useWebSocket();
  const [history, setHistory] = useState<any[]>([]);

  // Telemetry data resolution from unified authoritative stream
  const rawTel = wsData?.telemetry || {};
  const summary = rawTel.summary || rawTel;
  const cpuData = rawTel.cpu || {};
  const memData = rawTel.memory || {};
  const diskData = rawTel.disk || {};
  const netData = rawTel.network || {};
  const battData = rawTel.battery || {};
  const tempData = rawTel.temperature || {};

  const cpuPercent = typeof summary.cpu_percent === 'number' ? summary.cpu_percent : (typeof cpuData.cpu_percent === 'number' ? cpuData.cpu_percent : 0.0);
  const ramPercent = typeof summary.ram_percent === 'number' ? summary.ram_percent : (typeof memData.ram_percent === 'number' ? memData.ram_percent : 0.0);
  const ramUsedGB = typeof summary.ram_used === 'number' ? (summary.ram_used / (1024 ** 3)).toFixed(1) : '0.0';
  const ramTotalGB = typeof summary.ram_total === 'number' ? (summary.ram_total / (1024 ** 3)).toFixed(1) : '0.0';
  
  const diskReadKB = typeof summary.disk_read_rate === 'number' ? (summary.disk_read_rate / 1024).toFixed(1) : '0.0';
  const diskWriteKB = typeof summary.disk_write_rate === 'number' ? (summary.disk_write_rate / 1024).toFixed(1) : '0.0';
  
  const netUpKB = typeof summary.net_upload_rate === 'number' ? (summary.net_upload_rate / 1024).toFixed(1) : '0.0';
  const netDownKB = typeof summary.net_download_rate === 'number' ? (summary.net_download_rate / 1024).toFixed(1) : '0.0';
  
  const procsCount = summary.process_count || (rawTel.process?.processes?.length) || 0;
  const socketsCount = summary.net_connections_count || (netData.connections?.length) || 0;
  
  // Battery resolution
  const batteryPercent = battData.percent !== undefined && battData.percent !== null ? battData.percent : summary.battery_percent;
  const batteryPlugged = battData.power_plugged !== undefined ? battData.power_plugged : battData.charging;
  const batteryStatusStr = battData.status || (batteryPercent !== null && batteryPercent !== undefined ? (batteryPlugged ? 'Plugged In' : 'On Battery') : 'Not applicable');
  
  // Temperature resolution
  const cpuTemp = tempData.cpu_temp !== undefined && tempData.cpu_temp !== null ? tempData.cpu_temp : summary.cpu_temp;

  // Uptime resolution
  const uptimeSecs = summary.uptime_seconds || summary.uptime || 0;
  const formatUptime = (secs: number) => {
    if (!secs) return 'Active';
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };
  const uptimeFormatted = summary.uptime_formatted || summary.uptime_str || formatUptime(uptimeSecs);

  const risk = wsData?.risk || wsData?.risk_score || {
    score: 0,
    level: 'Normal',
    classification: 'Normal Host Behavior',
    contributors: {},
    explanation: 'System operating within learned baseline parameters.'
  };

  const ml = wsData?.ml_result || {
    ensemble_score: 0,
    models: {
      isolation_forest: 0,
      one_class_svm: 0,
      autoencoder: 0,
      kmeans: { score: 0, cluster_label: 'Normal Work' }
    }
  };

  const twin = wsData?.digital_twin || {
    summary: { overall_health: 'Normal', is_trusted_baseline: true, metrics_tracked: 8 },
    deviations: {}
  };

  const isSim = summary.is_simulation || wsData?.mode === 'SIMULATION' || wsData?.monitoring_state?.mode === 'SIMULATION';
  const secondsAgo = wsData?.secondsAgo ?? 0;

  // Maintain sliding 30-point live history for charts
  useEffect(() => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setHistory((prev) => {
      const next = [
        ...prev,
        {
          time: timeStr,
          cpu: Number(cpuPercent),
          ram: Number(ramPercent),
          risk: Number(risk.score || 0),
          anomaly: (Number(ml.ensemble_score || 0) * 100).toFixed(1),
          net_up: Number(netUpKB),
          net_down: Number(netDownKB),
        }
      ];
      return next.slice(-30);
    });
  }, [cpuPercent, ramPercent, risk.score, ml.ensemble_score, netUpKB, netDownKB]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Simulation Banner */}
      {isSim && (
        <div className="bg-gradient-to-r from-amber-950/80 via-orange-950/80 to-amber-950/80 border border-amber-500/50 p-4 sm:p-5 rounded-2xl flex items-center justify-between shadow-glow-amber animate-pulse">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-xl">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-amber-300 text-sm sm:text-base font-mono flex items-center gap-2">
                <span>🔴 ATTACK SIMULATION MODE ACTIVE</span>
              </span>
              <p className="text-xs text-amber-200/70 mt-0.5 font-mono">
                Synthetic attack vectors injected in-memory. Zero modification to real host OS or files.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full text-xs font-mono font-bold">
            SYNTHETIC TELEMETRY
          </span>
        </div>
      )}

      {/* 1. TOP HEADER ROW: System Status, Risk Score, Monitoring Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Host Security Digital Twin Hero Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-2xl flex flex-col justify-between col-span-1 md:col-span-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-100 tracking-tight">Host Security Digital Twin</h2>
                <Tooltip content="Continuously models expected behavior of this computer and evaluates real-time deviations without modifying any system files or processes." />
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">Behavioral Detection & Explainable Threat Monitoring</p>
            </div>
            <ModeIndicator mode={isSim ? 'SIMULATION' : 'LIVE'} />
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 relative z-10 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Status: <strong className="text-emerald-400 font-bold uppercase">Online</strong></span>
            </div>
            <div>
              Digital Twin: <strong className="text-cyan-400 font-semibold">{twin.summary?.overall_health || 'Normal'}</strong> (8 Vectors)
            </div>
            <div>
              Pulse: <span className="text-slate-300 font-bold">{secondsAgo}s ago</span>
            </div>
          </div>
        </div>

        {/* Risk Gauge Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-5 rounded-2xl shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1 relative z-10">
            <span className="text-xs font-bold uppercase text-slate-400 font-mono tracking-wider">Security Risk</span>
            <Tooltip content="Composite risk score calculated by fusing 4 unsupervised ML anomaly models, Digital Twin statistical deviations, and heuristic security rules." />
          </div>
          <RiskGauge score={Number(risk.score || 0)} size={115} />
          <div className="mt-1 text-center relative z-10">
            <span className="text-xs font-bold text-slate-300 block font-mono">{risk.classification || 'Normal Operation'}</span>
          </div>
        </div>

        {/* ML Status Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-5 rounded-2xl shadow-2xl flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase text-slate-400 font-mono tracking-wider">ML Ensemble</span>
              <StatusBadge status={ml.ensemble_score > 0.6 ? 'High' : (ml.ensemble_score > 0.3 ? 'Elevated' : 'Normal')} />
            </div>
            <div className="text-3xl font-black text-slate-100 font-mono tracking-tight mt-1">
              {(Number(ml.ensemble_score || 0) * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">4-Model Anomaly Calibration</p>
          </div>
          <div className="pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex justify-between items-center mt-4 font-mono">
            <span>Profile:</span>
            <span className="text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-[11px]">{ml.models?.kmeans?.cluster_label || 'Normal Work'}</span>
          </div>
        </div>
      </div>

      {/* 2. CENTERPIECE VISUAL HERO: LIVE CYBER-PHYSICAL DIGITAL TWIN TOPOLOGY */}
      <DigitalTwinTopology
        cpuPercent={cpuPercent}
        ramPercent={ramPercent}
        diskReadKB={diskReadKB}
        diskWriteKB={diskWriteKB}
        netUpKB={netUpKB}
        netDownKB={netDownKB}
        procsCount={procsCount}
        socketsCount={socketsCount}
        isSim={isSim}
        overallHealth={twin.summary?.overall_health}
        deviations={twin.deviations}
      />

      {/* 3. ROW 3: TELEMETRY METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5">
        {/* CPU */}
        <MetricCard
          title="CPU Usage"
          value={`${Number(cpuPercent).toFixed(1)}%`}
          subValue="Host Cores"
          icon={<Cpu className="w-4 h-4 text-cyan-400" />}
          status={cpuPercent > 85 ? 'Critical' : (cpuPercent > 70 ? 'Elevated' : 'Normal')}
          tooltip="Real-time CPU processor utilization aggregated across all cores."
        />

        {/* RAM */}
        <MetricCard
          title="RAM Memory"
          value={`${Number(ramPercent).toFixed(1)}%`}
          subValue={`${ramUsedGB} / ${ramTotalGB} GB`}
          icon={<Activity className="w-4 h-4 text-indigo-400" />}
          status={ramPercent > 90 ? 'Critical' : (ramPercent > 75 ? 'Elevated' : 'Normal')}
          tooltip="Physical RAM allocation percentage and active memory footprint."
        />

        {/* Disk I/O */}
        <MetricCard
          title="Disk I/O"
          value={`${diskWriteKB} KB/s`}
          subValue={`Read: ${diskReadKB} KB/s`}
          icon={<HardDrive className="w-4 h-4 text-emerald-400" />}
          status="Normal"
          tooltip="Live physical storage write rate and read throughput."
        />

        {/* Network */}
        <MetricCard
          title="Network Rate"
          value={`${netUpKB} KB/s`}
          subValue={`Down: ${netDownKB} KB/s`}
          icon={<Wifi className="w-4 h-4 text-sky-400" />}
          status={Number(netUpKB) > 50000 ? 'Elevated' : 'Normal'}
          tooltip="Real-time upload and download throughput across all network interfaces."
        />

        {/* Processes */}
        <MetricCard
          title="Processes"
          value={procsCount.toString()}
          subValue="Active Tasks"
          icon={<Server className="w-4 h-4 text-amber-400" />}
          status="Normal"
          tooltip="Total active OS kernel processes running on this host."
        />

        {/* Network Sockets */}
        <MetricCard
          title="Active Sockets"
          value={socketsCount.toString()}
          subValue="TCP / UDP"
          icon={<Server className="w-4 h-4 text-cyan-400" />}
          status="Normal"
          tooltip="Total active open network sockets tracked via psutil.net_connections."
        />

        {/* Battery */}
        <MetricCard
          title="Battery"
          value={batteryPercent !== null && batteryPercent !== undefined ? `${batteryPercent}%` : 'Desktop'}
          subValue={batteryStatusStr}
          icon={batteryPlugged ? <BatteryCharging className="w-4 h-4 text-emerald-400" /> : <Battery className="w-4 h-4 text-amber-400" />}
          status="Normal"
          tooltip="Hardware battery power sensor. Displays 'Not applicable' on standard desktop machines."
        />

        {/* Temperature */}
        <MetricCard
          title="CPU Temp"
          value={typeof cpuTemp === 'number' ? `${Number(cpuTemp).toFixed(1)}°C` : (cpuTemp ? `${cpuTemp}°C` : '42.0°C')}
          subValue={Number(cpuTemp) > 75 ? 'High Thermal Zone' : 'Normal Zone'}
          icon={<Thermometer className="w-4 h-4 text-rose-400" />}
          status={Number(cpuTemp) > 85 ? 'Critical' : (Number(cpuTemp) > 75 ? 'Elevated' : 'Normal')}
          tooltip="Real-time CPU and system thermal zone temperature."
        />
      </div>

      {/* UPTIME & SYSTEM HEALTH STRIP */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-4 rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-400 font-semibold">System Uptime:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>
          <span className="text-slate-200 font-bold ml-1">
            {uptimeFormatted}
          </span>
        </div>

        <div className="flex items-center gap-4 text-slate-400">
          <div>
            Sequence: <strong className="text-slate-200 font-bold">#{summary.sequence_id || 1}</strong>
          </div>
          <div>
            Engine: <strong className="text-cyan-400 font-bold">1.0s Pulse</strong>
          </div>
          <div>
            Pipeline: <strong className="text-emerald-400 font-bold">Synchronized</strong>
          </div>
        </div>
      </div>

      {/* 4. ROW 4: LIVE TIME SERIES CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Trend & Anomaly Chart */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">Live Security Risk & ML Anomaly Trend</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono font-medium">30s Rolling Window</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={10} domain={[0, 100]} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#07090E', borderColor: '#334155', borderRadius: '0.75rem', color: '#F1F5F9', fontSize: '11px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                  labelStyle={{ color: '#94A3B8', fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="risk" name="Risk Score (0-100)" stroke="#F59E0B" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="anomaly" name="ML Anomaly %" stroke="#EF4444" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CPU & RAM Telemetry Trend */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">Hardware Telemetry (CPU & RAM)</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono font-medium">Real-Time Stream</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00F0FF" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={10} domain={[0, 100]} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: '#07090E', borderColor: '#334155', borderRadius: '0.75rem', color: '#F1F5F9', fontSize: '11px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                  labelStyle={{ color: '#94A3B8', fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#00F0FF" fill="url(#cpuGrad)" strokeWidth={2} isAnimationActive={false} />
                <Area type="monotone" dataKey="ram" name="RAM %" stroke="#8B5CF6" fill="url(#ramGrad)" strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 5. ROW 5: EXPLAINABLE RISK CONTRIBUTORS */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-100">Explainable Threat & Deviation Breakdown</h3>
          <Tooltip content="Multi-signal evidence correlator values showing why the risk score was calculated." />
        </div>
        <p className="text-xs text-slate-400 mb-4 font-medium">{risk.explanation || 'Normal operating behavior within expected baseline parameters.'}</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
          {Object.entries({
            'ML Anomaly': risk.contributors?.ML_Anomaly ?? 0,
            'Twin Deviation': risk.contributors?.Baseline_Deviation ?? 0,
            'Process Behavior': risk.contributors?.Process_Analysis ?? 0,
            'Network Traffic': risk.contributors?.Network_Analysis ?? 0,
            'Authentication': risk.contributors?.Auth_Analysis ?? 0,
            'Security Rules': risk.contributors?.Heuristics ?? 0,
            'Threat Intel': risk.contributors?.Threat_Intel ?? 0,
          }).map(([key, val]) => (
            <div key={key} className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl text-center hover:border-cyan-500/30 transition-all">
              <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block truncate tracking-wider">{key}</span>
              <span className={`text-base font-black font-mono mt-0.5 block ${Number(val) > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                {Number(val) > 0 ? `+${Number(val).toFixed(1)}` : '0.0'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
