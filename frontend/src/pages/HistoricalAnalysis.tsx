import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tooltip } from '../components/common/Tooltip';
import {
  BarChart3, Calendar, TrendingUp, RefreshCw,
  Cpu, HardDrive, Wifi, Activity, Server, ShieldAlert, Radio
} from 'lucide-react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import axios from 'axios';
import { usePageCache } from '../hooks/useWebSocket';

export const HistoricalAnalysis: React.FC = () => {
  const pageCache = usePageCache();
  const [history, setHistory] = useState<any[]>(pageCache.history || []);
  const [riskHistory, setRiskHistory] = useState<any[]>(pageCache.riskHistory || []);
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasDataRef = useRef(pageCache.history?.length > 0 || pageCache.riskHistory?.length > 0);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  // Sync with global cache immediately on update
  useEffect(() => {
    if (pageCache.history && pageCache.history.length > 0) {
      hasDataRef.current = true;
      setHistory(pageCache.history);
    }
    if (pageCache.riskHistory && pageCache.riskHistory.length > 0) {
      setRiskHistory(pageCache.riskHistory);
    }
  }, [pageCache.history, pageCache.riskHistory]);

  const getHoursFromRange = (range: string) => {
    switch (range) {
      case '1h': return 1;
      case '24h': return 24;
      case '7d': return 168;
      case '30d': return 720;
      default: return 24;
    }
  };

  const fetchHistory = useCallback(async (isManual = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const controller = new AbortController();

    try {
      if (isManual && !hasDataRef.current) {
        setLoading(true);
      } else if (isManual) {
        setRefreshing(true);
      }
      setError(null);
      const hours = getHoursFromRange(timeRange);
      const [resTel, resRisk] = await Promise.allSettled([
        axios.get(`/api/telemetry/history?limit=150&hours=${hours}`, { signal: controller.signal }),
        axios.get(`/api/security/risk/history?limit=150&hours=${hours}`, { signal: controller.signal })
      ]);

      if (!mountedRef.current) return;
      if (resTel.status === 'fulfilled' && Array.isArray(resTel.value.data)) {
        hasDataRef.current = true;
        setHistory(resTel.value.data);
      }
      if (resRisk.status === 'fulfilled' && Array.isArray(resRisk.value.data)) {
        hasDataRef.current = true;
        setRiskHistory(resRisk.value.data);
      }
    } catch (e: any) {
      if (e?.code === 'ERR_CANCELED') return;
      console.error('Error fetching historical telemetry', e);
      if (mountedRef.current && !hasDataRef.current) {
        setError(e?.response?.data?.detail || e.message || 'Failed to query historical telemetry database');
      }
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [timeRange]);

  useEffect(() => {
    mountedRef.current = true;
    fetchHistory();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchHistory]);

  // Combine and format chart data
  const chartData = history.map((item, idx) => {
    const riskItem = riskHistory[idx] || {};
    const dt = item.timestamp ? new Date(item.timestamp) : new Date();
    const timeStr = timeRange === '1h' || timeRange === '24h'
      ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : `${dt.getMonth() + 1}/${dt.getDate()} ${dt.getHours()}:00`;

    return {
      time: timeStr,
      cpu: typeof item.cpu_percent === 'number' ? Number(item.cpu_percent.toFixed(1)) : 0,
      ram: typeof item.ram_percent === 'number' ? Number(item.ram_percent.toFixed(1)) : 0,
      net_up: typeof item.net_upload_rate === 'number' ? Number((item.net_upload_rate / 1024).toFixed(1)) : 0,
      net_down: typeof item.net_download_rate === 'number' ? Number((item.net_download_rate / 1024).toFixed(1)) : 0,
      disk_write: typeof item.disk_write_rate === 'number' ? Number((item.disk_write_rate / 1024).toFixed(1)) : 0,
      disk_read: typeof item.disk_read_rate === 'number' ? Number((item.disk_read_rate / 1024).toFixed(1)) : 0,
      procs: item.process_count || 0,
      risk: typeof riskItem.overall_score === 'number' ? Number(riskItem.overall_score.toFixed(1)) : 0
    };
  }).reverse();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Tactical Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0 shadow-glow-cyan/20">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-100 tracking-tight font-mono">
                  HISTORICAL TELEMETRY & DRIFT ANALYSIS
                </h1>
                <Tooltip content="Historical database queries across resource workloads, anomaly trends, and security risk scores." />
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Analyzing persistent behavioral drift and historical baseline deviations across <span className="text-cyan-400 font-mono font-bold">{chartData.length}</span> records
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-mono">
              {['1h', '24h', '7d', '30d'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    timeRange === range
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchHistory(true)}
              disabled={loading || refreshing}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/70 rounded-xl text-xs font-mono font-semibold transition-all shrink-0 hover:border-cyan-500/40"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${(loading || refreshing) ? 'animate-spin text-cyan-400' : ''}`} />
              <span>QUERY DB</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-950/30 border border-rose-800/60 text-rose-300 p-4 rounded-xl flex items-center justify-between text-xs font-mono">
          <span>{error}</span>
          <button
            onClick={() => fetchHistory(true)}
            className="px-3 py-1 bg-rose-900/40 hover:bg-rose-900/70 rounded-lg border border-rose-700/60 font-semibold text-rose-200"
          >
            RETRY
          </button>
        </div>
      )}

      {/* Historical Charts Content */}
      {loading && chartData.length === 0 ? (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-16 text-center shadow-2xl">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-200 font-mono">Querying Historical Database Records...</h3>
          <p className="text-xs text-slate-400 mt-1">Retrieving persisted telemetry snapshots and risk calculations.</p>
        </div>
      ) : chartData.length === 0 ? (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-16 text-center space-y-3 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-200 font-mono">No Historical Telemetry Recorded Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed font-sans font-medium">
            The background monitoring service periodically commits snapshots to the SQLite telemetry database every few seconds. Once telemetry has accumulated, trends and historical time-series charts will populate here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Risk History */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 rounded-2xl shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider mb-4 flex items-center gap-2.5">
              <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                <TrendingUp className="w-4 h-4" />
              </div>
              Historical Security Risk Progression
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="histRiskCyber" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 100]} stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0b0f19', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '11px', fontFamily: 'monospace' }} />
                  <Area type="monotone" dataKey="risk" stroke="#f59e0b" strokeWidth={2.5} fill="url(#histRiskCyber)" name="Risk Score (0-100)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. CPU & Memory History */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 rounded-2xl shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider mb-4 flex items-center gap-2.5">
              <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
                <Cpu className="w-4 h-4" />
              </div>
              CPU & Memory Allocation History
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 100]} stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0b0f19', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '11px', fontFamily: 'monospace' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px', fontFamily: 'monospace' }} />
                  <Line type="monotone" dataKey="cpu" stroke="#00f0ff" strokeWidth={2.5} dot={false} name="CPU %" />
                  <Line type="monotone" dataKey="ram" stroke="#818cf8" strokeWidth={2.5} dot={false} name="RAM %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. Network Throughput History */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 rounded-2xl shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider mb-4 flex items-center gap-2.5">
              <div className="p-1.5 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20">
                <Wifi className="w-4 h-4" />
              </div>
              Network Throughput Volume (KB/s)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0b0f19', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '11px', fontFamily: 'monospace' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px', fontFamily: 'monospace' }} />
                  <Line type="monotone" dataKey="net_up" stroke="#38bdf8" strokeWidth={2.5} dot={false} name="Upload (KB/s)" />
                  <Line type="monotone" dataKey="net_down" stroke="#c084fc" strokeWidth={2.5} dot={false} name="Download (KB/s)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. Disk I/O History */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 rounded-2xl shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider mb-4 flex items-center gap-2.5">
              <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                <HardDrive className="w-4 h-4" />
              </div>
              Disk Read & Write Throughput (KB/s)
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <RechartsTooltip contentStyle={{ backgroundColor: '#0b0f19', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '11px', fontFamily: 'monospace' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px', fontFamily: 'monospace' }} />
                  <Line type="monotone" dataKey="disk_write" stroke="#34d399" strokeWidth={2.5} dot={false} name="Disk Write (KB/s)" />
                  <Line type="monotone" dataKey="disk_read" stroke="#38bdf8" strokeWidth={2.5} dot={false} name="Disk Read (KB/s)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricalAnalysis;
