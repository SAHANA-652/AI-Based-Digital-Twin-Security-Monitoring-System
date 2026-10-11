import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tooltip } from '../components/common/Tooltip';
import {
  Network, Search, ShieldCheck, ShieldAlert,
  ArrowUpRight, ArrowDownLeft, RefreshCw, Globe, Server, Activity, Radio
} from 'lucide-react';
import axios from 'axios';
import { usePageCache } from '../hooks/useWebSocket';

export const NetworkMonitor: React.FC = () => {
  const pageCache = usePageCache();
  const [connections, setConnections] = useState<any[]>(pageCache.networkConnections || []);
  const [stats, setStats] = useState<any>(pageCache.networkStats || { upload_rate: 0, download_rate: 0, connection_count: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const hasDataRef = useRef(pageCache.networkConnections?.length > 0);
  const fetchInFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Sync with global cache immediately on update
  useEffect(() => {
    if (pageCache.networkConnections && pageCache.networkConnections.length > 0) {
      hasDataRef.current = true;
      setConnections(pageCache.networkConnections);
    }
    if (pageCache.networkStats) {
      setStats(pageCache.networkStats);
    }
  }, [pageCache.networkConnections, pageCache.networkStats]);

  const fetchNetworkData = useCallback(async (isManual = false) => {
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;
    abortRef.current = new AbortController();

    try {
      if (isManual && !hasDataRef.current) {
        setLoading(true);
      } else if (isManual) {
        setRefreshing(true);
      }
      setError(null);
      const [resConns, resStats] = await Promise.allSettled([
        axios.get('/api/network/connections', { signal: abortRef.current.signal }),
        axios.get('/api/network/stats', { signal: abortRef.current.signal })
      ]);

      if (!mountedRef.current) return;
      if (resConns.status === 'fulfilled' && Array.isArray(resConns.value.data)) {
        hasDataRef.current = true;
        setConnections(resConns.value.data);
      }
      if (resStats.status === 'fulfilled' && resStats.value.data) {
        hasDataRef.current = true;
        setStats(resStats.value.data);
      }
    } catch (e: any) {
      if (e?.code === 'ERR_CANCELED') return;
      console.error('Error fetching network data', e);
      if (!hasDataRef.current) {
        setError(e?.response?.data?.detail || e.message || 'Failed to fetch network socket telemetry');
      }
    } finally {
      fetchInFlightRef.current = false;
      abortRef.current = null;
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!hasDataRef.current) {
      fetchNetworkData();
    }
    const interval = setInterval(() => fetchNetworkData(false), 4000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [fetchNetworkData]);

  const filtered = connections.filter((c) => {
    const conn = c.connection || c;
    const ip = (conn.remote_address || conn.remote_ip || '').toString();
    const port = (conn.remote_port || '').toString();
    const proc = (conn.process_name || '').toString().toLowerCase();
    const laddr = (conn.local_address || '').toString();
    const q = search.toLowerCase();
    return ip.includes(q) || port.includes(q) || proc.includes(q) || laddr.includes(q);
  });

  const uploadKb = ((stats.upload_rate || stats.net_upload_rate || 0) / 1024).toFixed(1);
  const downloadKb = ((stats.download_rate || stats.net_download_rate || 0) / 1024).toFixed(1);
  const activeSocketCount = stats.connection_count || stats.net_connections_count || connections.length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Tactical Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0 shadow-glow-indigo/20">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-100 tracking-tight font-mono">
                  NETWORK & SOCKET TELEMETRY
                </h1>
                <Tooltip content="Live socket inspection. An unfamiliar remote IP or port is never flagged as malware solely because it is unfamiliar." />
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Tracking <span className="text-indigo-400 font-mono font-bold">{connections.length}</span> active sockets, transmission throughput, and endpoint reputation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Filter by IP, Port, Process..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950/70 border border-slate-800/90 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 font-mono transition-all"
              />
            </div>
            <button
              onClick={() => fetchNetworkData(true)}
              disabled={loading || refreshing}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/70 rounded-xl text-xs font-mono font-semibold transition-all shrink-0 hover:border-indigo-500/40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading || refreshing ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
              <span>REFRESH</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-950/30 border border-rose-800/60 text-rose-300 p-4 rounded-xl flex items-center justify-between text-xs font-mono">
          <span>{error}</span>
          <button
            onClick={() => fetchNetworkData(true)}
            className="px-3 py-1 bg-rose-900/40 hover:bg-rose-900/70 rounded-lg border border-rose-700/60 font-semibold text-rose-200"
          >
            RETRY
          </button>
        </div>
      )}

      {/* High-Tech Network Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-5 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
          <div>
            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Upload Throughput
            </span>
            <div className="text-2xl font-black font-mono text-cyan-400 tracking-tight mt-1">
              {uploadKb} <span className="text-xs font-mono font-semibold text-slate-400">KB/s</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Outbound Bandwidth Stream</span>
          </div>
          <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20 shadow-glow-cyan/20">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-5 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
          <div>
            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Download Throughput
            </span>
            <div className="text-2xl font-black font-mono text-indigo-400 tracking-tight mt-1">
              {downloadKb} <span className="text-xs font-mono font-semibold text-slate-400">KB/s</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Inbound Telemetry Stream</span>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20 shadow-glow-indigo/20">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-5 rounded-2xl shadow-xl flex items-center justify-between relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <div>
            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active System Sockets
            </span>
            <div className="text-2xl font-black font-mono text-emerald-400 tracking-tight mt-1">
              {activeSocketCount} <span className="text-xs font-mono font-semibold text-slate-400">sockets</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">Live Socket Bindings</span>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20 shadow-glow-emerald/20">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Network Connections Table */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">Live Socket Telemetry Stream</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Showing {Math.min(filtered.length, 100)} of {filtered.length} matching</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-mono font-bold border-b border-slate-800/80 text-[10px]">
              <tr>
                <th className="p-3.5">Protocol</th>
                <th className="p-3.5">Local Interface</th>
                <th className="p-3.5">Remote Destination</th>
                <th className="p-3.5">Attached Binary / PID</th>
                <th className="p-3.5">Socket State</th>
                <th className="p-3.5">Intel Reputation</th>
                <th className="p-3.5 text-right">Risk Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading && connections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Scanning active kernel sockets...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 font-medium">
                    No active sockets matching current filter.
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 100).map((item, idx) => {
                  const conn = item.connection || item;
                  const isNew = item.is_new_ip;
                  const riskScore = item.risk_score || item.anomaly_score || 0;
                  const isSuspicious = item.is_suspicious || riskScore > 0.25;

                  return (
                    <tr key={idx} className={`hover:bg-slate-800/50 transition-colors ${isSuspicious ? 'bg-amber-950/15 border-l-2 border-l-amber-400' : ''}`}>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 uppercase">
                          {conn.protocol || 'TCP'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400 font-mono">
                        {conn.local_address}:{conn.local_port}
                      </td>
                      <td className="p-3.5 font-bold font-mono">
                        {conn.remote_address && conn.remote_address !== '*' ? (
                          <span className="text-cyan-300">{conn.remote_address}:{conn.remote_port}</span>
                        ) : (
                          <span className="text-slate-500 font-normal">Listening / Any</span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-200 font-sans">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                            <Server className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-bold truncate max-w-[140px] font-mono text-xs">{conn.process_name || 'System'}</span>
                          {conn.pid && <span className="text-slate-500 font-mono text-[11px]">({conn.pid})</span>}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          conn.status === 'ESTABLISHED' 
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50' 
                            : conn.status === 'LISTEN'
                            ? 'bg-slate-800 text-slate-300 border-slate-700/60'
                            : 'bg-indigo-950/40 text-indigo-300 border-indigo-800/50'
                        }`}>
                          {conn.status || 'NONE'}
                        </span>
                      </td>
                      <td className="p-3.5 font-sans">
                        {isNew ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold">
                            <Globe className="w-3 h-3" /> NEW ENDPOINT
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" /> VERIFIED
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right font-sans">
                        {isSuspicious ? (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-bold font-mono text-[11px] bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                            <ShieldAlert className="w-3.5 h-3.5" /> ELEVATED ({(riskScore * 100).toFixed(0)}%)
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px] font-mono">NORMAL</span>
                        )}
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

export default NetworkMonitor;
