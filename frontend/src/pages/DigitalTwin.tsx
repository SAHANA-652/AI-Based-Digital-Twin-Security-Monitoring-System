import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { Tooltip } from '../components/common/Tooltip';
import { StatusBadge } from '../components/common/StatusBadge';
import { ModeIndicator } from '../components/common/ModeIndicator';
import {
  Cpu, Activity, CheckCircle2, AlertTriangle, RefreshCw,
  Shield, Layers, Gauge, Info, HardDrive, Wifi, Server, Battery
} from 'lucide-react';
import axios from 'axios';

import { DigitalTwinTopology } from '../components/common/DigitalTwinTopology';

export const DigitalTwin: React.FC = () => {
  const wsData = useWebSocket();
  const [twinData, setTwinData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchTwinState = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const res = await axios.get('/api/twin/state', { signal });
      if (signal?.aborted) return;
      setTwinData(res.data);
    } catch (e: any) {
      if (e?.code === 'ERR_CANCELED') return;
      console.error('Error fetching digital twin state', e);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchTwinState(controller.signal);
    return () => controller.abort();
  }, []);

  // Synchronized telemetry from authoritative stream
  const rawTel = wsData?.telemetry || {};
  const summary = rawTel.summary || rawTel;
  const isSim = summary.is_simulation || wsData?.mode === 'SIMULATION';

  const deviations = wsData?.digital_twin?.deviations || twinData?.deviations || {};
  const twinSummary = wsData?.digital_twin?.summary || twinData?.summary || {
    overall_health: 'Normal',
    is_trusted_baseline: true,
    metrics_tracked: 8
  };

  const metricMeta: Record<string, { label: string; unit: string; icon: any }> = {
    cpu_percent: { label: 'CPU Utilization', unit: '%', icon: Cpu },
    ram_percent: { label: 'RAM Memory Footprint', unit: '%', icon: Activity },
    disk_usage: { label: 'Disk Storage Usage', unit: '%', icon: HardDrive },
    net_upload_rate: { label: 'Network Upload Throughput', unit: 'B/s', icon: Wifi },
    net_download_rate: { label: 'Network Download Throughput', unit: 'B/s', icon: Wifi },
    process_count: { label: 'Active Process Count', unit: ' procs', icon: Server },
    net_connections_count: { label: 'Active Sockets', unit: ' conns', icon: Server },
    cpu_temp: { label: 'Thermal Zone Temperature', unit: '°C', icon: Activity },
    battery_percent: { label: 'Battery Capacity', unit: '%', icon: Battery }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 rounded-2xl shadow-2xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-glow-cyan">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-100 tracking-tight">
                  Behavioral Digital Twin Architecture
                </h1>
                <Tooltip content="The Digital Twin maintains a statistical baseline and dynamic state model of this computer's normal operating behavior." />
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Dynamic Expectation Modeling vs Live System State with Baseline Poisoning Protection
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ModeIndicator mode={isSim ? 'SIMULATION' : 'LIVE'} />
          <button
            onClick={() => fetchTwinState()}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold shadow-subtle transition-all font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
            <span>Refresh Twin</span>
          </button>
        </div>
      </div>

      {/* Architectural Flow Pipeline Visualizer */}
      <div className="bg-slate-950/70 border border-slate-800/80 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {[
          { label: 'REAL HOST SYSTEM', status: 'Continuous Telemetry', color: 'text-cyan-400' },
          { label: 'DIGITAL TWIN REPLICA', status: 'Statistical Baseline', color: 'text-indigo-400' },
          { label: 'TELEMETRY COMPARATOR', status: 'Z-Score Variance', color: 'text-sky-400' },
          { label: 'AI ANOMALY ENSEMBLE', status: '4-Model Inferences', color: 'text-purple-400' },
          { label: 'SECURITY RESPONSE', status: 'Explainable Actions', color: 'text-emerald-400' },
        ].map((step, idx, arr) => (
          <React.Fragment key={step.label}>
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <div>
                <span className={`font-bold block tracking-wider ${step.color}`}>{step.label}</span>
                <span className="text-[10px] text-slate-500">{step.status}</span>
              </div>
            </div>
            {idx < arr.length - 1 && (
              <span className="hidden md:inline text-slate-600 font-bold text-sm">➔</span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Centerpiece Interactive Living Topology */}
      <DigitalTwinTopology
        cpuPercent={typeof summary.cpu_percent === 'number' ? summary.cpu_percent : 0}
        ramPercent={typeof summary.ram_percent === 'number' ? summary.ram_percent : 0}
        diskWriteKB={typeof summary.disk_write_rate === 'number' ? (summary.disk_write_rate / 1024).toFixed(1) : '0.0'}
        socketsCount={summary.net_connections_count || 0}
        procsCount={summary.process_count || 0}
        isSim={isSim}
        overallHealth={twinSummary.overall_health}
        deviations={deviations}
      />

      {/* State Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-5 rounded-2xl shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono font-bold uppercase tracking-wider">Twin Synchronization</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-100 tracking-tight">
            {isSim ? 'Simulation Overlaid' : 'Live Synchronized'}
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono font-medium">Sequence #{summary.sequence_id || 1} • Continuous 1.0s stream</p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-5 rounded-2xl shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono font-bold uppercase tracking-wider">Baseline Trust State</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-100 tracking-tight">
            {twinSummary.is_trusted_baseline ? 'Trusted & Active' : 'Learning Phase'}
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono font-medium">Gated with z-score anomaly rejection</p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-5 rounded-2xl shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono font-bold uppercase tracking-wider">Overall Twin Health</span>
            <StatusBadge status={twinSummary.overall_health || 'Normal'} />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-100 tracking-tight">
            {twinSummary.overall_health || 'Normal'}
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono font-medium">Tracking {twinSummary.metrics_tracked || 8} primary metric vectors</p>
        </div>
      </div>

      {/* Deviations Table */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider">Metric Vector Deviations (Expected vs Actual)</h2>
              <p className="text-xs text-slate-400 font-medium">Real-Time Twin Statistical Comparator</p>
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono font-medium">Live Stream</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-mono font-bold border-b border-slate-800/80 text-[10px]">
              <tr>
                <th className="p-4">Metric Vector</th>
                <th className="p-4">Live Actual</th>
                <th className="p-4">Learned Baseline</th>
                <th className="p-4">Expected Value</th>
                <th className="p-4">Statistical Deviation</th>
                <th className="p-4 text-right">Deviation Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {Object.keys(deviations).length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                    Synchronizing live baseline deviations with Digital Twin engine...
                  </td>
                </tr>
              ) : (
                Object.entries(deviations).map(([key, item]: [string, any]) => {
                  const meta = metricMeta[key] || { label: key, unit: '', icon: Activity };
                  const Icon = meta.icon;
                  const currentVal = typeof item.current === 'number' ? item.current.toFixed(1) : (item.current ?? 'N/A');
                  const expectedVal = typeof item.expected === 'number' ? item.expected.toFixed(1) : (item.expected ?? 'N/A');
                  const baselineMean = typeof item.baseline?.mean === 'number' ? item.baseline.mean.toFixed(1) : (item.baseline?.mean ?? 'Adapting');
                  const devScore = typeof item.deviation === 'number' ? item.deviation.toFixed(2) : (item.deviation ?? '0.00');

                  return (
                    <tr key={key} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-semibold text-slate-200 flex items-center gap-2.5 font-sans">
                        <div className="p-1.5 rounded-lg bg-slate-800 text-cyan-400 border border-slate-700/60">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span>{meta.label}</span>
                      </td>
                      <td className="p-4 font-bold text-slate-100">
                        {currentVal}{meta.unit}
                      </td>
                      <td className="p-4 text-slate-400">
                        {baselineMean}{meta.unit !== 'N/A' && typeof baselineMean === 'number' ? meta.unit : ''}
                      </td>
                      <td className="p-4 text-cyan-400 font-semibold">
                        {expectedVal}{meta.unit}
                      </td>
                      <td className="p-4">
                        <span className={`font-bold ${
                          Number(devScore) > 2 ? 'text-rose-400' : Number(devScore) > 1 ? 'text-amber-400' : 'text-slate-400'
                        }`}>
                          {Number(devScore) > 0 ? `+${devScore}` : devScore}σ
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <StatusBadge status={item.status || 'Normal'} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DigitalTwin;
