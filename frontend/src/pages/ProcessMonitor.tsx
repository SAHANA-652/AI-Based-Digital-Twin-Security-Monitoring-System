import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tooltip } from '../components/common/Tooltip';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Activity, Search, ShieldAlert, Cpu, HardDrive,
  RefreshCw, Terminal, Eye, X, CornerDownRight, ShieldCheck, User, Zap
} from 'lucide-react';
import axios from 'axios';
import { usePageCache } from '../hooks/useWebSocket';

export const ProcessMonitor: React.FC = () => {
  const pageCache = usePageCache();
  const [processes, setProcesses] = useState<any[]>(pageCache.processes || []);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProc, setSelectedProc] = useState<any>(null);
  const [procDetail, setProcDetail] = useState<any>(null);
  const mountedRef = useRef(true);
  const hasDataRef = useRef(pageCache.processes?.length > 0);
  const fetchInFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Sync with global cache immediately on update
  useEffect(() => {
    if (pageCache.processes && pageCache.processes.length > 0) {
      hasDataRef.current = true;
      setProcesses(pageCache.processes);
    }
  }, [pageCache.processes]);

  const fetchProcesses = useCallback(async (isManual = false) => {
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
      const res = await axios.get('/api/processes', { signal: abortRef.current.signal });
      if (!mountedRef.current) return;
      if (Array.isArray(res.data)) {
        hasDataRef.current = true;
        setProcesses(res.data);
      }
    } catch (e: any) {
      if (e?.code === 'ERR_CANCELED') return;
      console.error('Error fetching processes', e);
      if (!hasDataRef.current) {
        setError(e?.response?.data?.detail || e.message || 'Failed to fetch process telemetry');
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
      fetchProcesses();
    }
    const interval = setInterval(() => fetchProcesses(false), 4000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [fetchProcesses]);

  const handleSelectProcess = async (proc: any) => {
    setSelectedProc(proc);
    try {
      const res = await axios.get(`/api/processes/${proc.pid}`);
      setProcDetail(res.data);
    } catch (e) {
      setProcDetail({ process: proc, tree: {}, risk: { score: proc.anomaly_score, explanation: proc.risk_explanation } });
    }
  };

  const filtered = processes.filter((p) =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.pid || '').toString().includes(search) ||
    (p.username || '').toLowerCase().includes(search.toLowerCase())
  );

  // Compute telemetry summary metrics
  const elevatedCount = processes.filter(p => p.is_suspicious || (p.anomaly_score > 0.35)).length;
  const topCpuProc = [...processes].sort((a, b) => (b.cpu_percent || 0) - (a.cpu_percent || 0))[0];
  const totalRssBytes = processes.reduce((acc, p) => acc + (p.memory_rss || 0), 0);
  const totalRssMb = (totalRssBytes / (1024 * 1024)).toFixed(0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Tactical Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0 shadow-glow-cyan/20">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-100 tracking-tight font-mono">
                  PROCESS & EXECUTION MONITOR
                </h1>
                <Tooltip content="Live monitoring of active operating system processes with heuristic and anomaly scoring. Unfamiliar processes are never labeled malware automatically." />
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Tracking <span className="text-cyan-400 font-mono font-bold">{processes.length}</span> active host processes, memory allocations, and execution hierarchies
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Filter by PID, Binary, Account..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950/70 border border-slate-800/90 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 font-mono transition-all"
              />
            </div>
            <button
              onClick={() => fetchProcesses(true)}
              disabled={loading || refreshing}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/70 rounded-xl text-xs font-mono font-semibold transition-all shrink-0 hover:border-cyan-500/40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading || refreshing ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
              <span>REFRESH</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-800/60">
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/50">
            <div className="text-[10px] uppercase font-mono text-slate-500 font-semibold tracking-wider">Active Host Procs</div>
            <div className="text-lg font-black font-mono text-slate-100 mt-0.5">{processes.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/50">
            <div className="text-[10px] uppercase font-mono text-slate-500 font-semibold tracking-wider">Elevated Risk</div>
            <div className={`text-lg font-black font-mono mt-0.5 ${elevatedCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {elevatedCount} <span className="text-xs font-sans text-slate-500 font-normal">flagged</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/50">
            <div className="text-[10px] uppercase font-mono text-slate-500 font-semibold tracking-wider">Top CPU Consumer</div>
            <div className="text-sm font-bold font-mono text-cyan-400 truncate mt-1">
              {topCpuProc ? `${topCpuProc.name} (${topCpuProc.cpu_percent?.toFixed(1)}%)` : 'Scanning...'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/50">
            <div className="text-[10px] uppercase font-mono text-slate-500 font-semibold tracking-wider">Total Active RSS</div>
            <div className="text-lg font-black font-mono text-indigo-400 mt-0.5">{totalRssMb} <span className="text-xs font-sans text-slate-500 font-normal">MB</span></div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-950/30 border border-rose-800/60 text-rose-300 p-4 rounded-xl flex items-center justify-between text-xs font-mono">
          <span>{error}</span>
          <button
            onClick={() => fetchProcesses(true)}
            className="px-3 py-1 bg-rose-900/40 hover:bg-rose-900/70 rounded-lg border border-rose-700/60 font-semibold text-rose-200"
          >
            RETRY
          </button>
        </div>
      )}

      {/* Main Process Table */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-mono font-bold border-b border-slate-800/80 text-[10px]">
              <tr>
                <th className="p-3.5">PID</th>
                <th className="p-3.5">Binary Name</th>
                <th className="p-3.5">Parent Tree</th>
                <th className="p-3.5 w-32">CPU %</th>
                <th className="p-3.5 w-32">RAM %</th>
                <th className="p-3.5">RSS Mem</th>
                <th className="p-3.5">Account</th>
                <th className="p-3.5">State</th>
                <th className="p-3.5">Risk Assessment</th>
                <th className="p-3.5 text-right">Telemetry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading && processes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-500 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Ingesting active OS process telemetry...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-500 font-medium">
                    No active processes matching current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((proc) => {
                  const isSuspicious = proc.is_suspicious || (proc.anomaly_score > 0.35);
                  const cpuVal = typeof proc.cpu_percent === 'number' ? proc.cpu_percent : 0;
                  const ramVal = typeof proc.memory_percent === 'number' ? proc.memory_percent : 0;

                  return (
                    <tr
                      key={proc.pid}
                      className={`hover:bg-slate-800/50 transition-colors cursor-pointer ${
                        isSuspicious ? 'bg-amber-950/15 border-l-2 border-l-amber-400' : ''
                      }`}
                      onClick={() => handleSelectProcess(proc)}
                    >
                      <td className="p-3.5 font-bold text-cyan-400">{proc.pid}</td>
                      <td className="p-3.5 font-bold text-slate-100 flex items-center gap-2 font-sans">
                        <div className="p-1 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                          <Terminal className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate max-w-[160px] font-mono">{proc.name}</span>
                      </td>
                      <td className="p-3.5 text-slate-400 text-xs">
                        {proc.parent_name || (proc.ppid ? `PID ${proc.ppid}` : 'None')}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-cyan-400 w-10 text-right">{cpuVal.toFixed(1)}%</span>
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden min-w-[40px]">
                            <div
                              className="h-full bg-cyan-400 rounded-full transition-all"
                              style={{ width: `${Math.min(100, cpuVal)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-indigo-400 w-10 text-right">{ramVal.toFixed(1)}%</span>
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden min-w-[40px]">
                            <div
                              className="h-full bg-indigo-400 rounded-full transition-all"
                              style={{ width: `${Math.min(100, ramVal)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-400">
                        {((proc.memory_rss || 0) / (1024 * 1024)).toFixed(1)} MB
                      </td>
                      <td className="p-3.5 text-slate-400 truncate max-w-[110px]">
                        {proc.username || 'System'}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700/70">
                          {proc.status || 'running'}
                        </span>
                      </td>
                      <td className="p-3.5 font-sans">
                        {isSuspicious ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            ELEVATED ({(Number(proc.anomaly_score || 0.4) * 100).toFixed(0)}%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Normal
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right font-sans">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectProcess(proc);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 rounded-lg border border-slate-700 hover:border-cyan-500/50 text-[11px] font-mono font-bold transition-all shadow-sm"
                        >
                          INSPECT
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Process Detail Modal */}
      {selectedProc && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto text-slate-200">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

            <button
              onClick={() => setSelectedProc(null)}
              className="absolute right-5 top-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 border-b border-slate-800 pb-4">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 tracking-tight font-mono">
                  {selectedProc.name} <span className="text-cyan-400 font-mono text-sm">(PID: {selectedProc.pid})</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono">Deep Behavioral & Execution Context Telemetry</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 col-span-2">
                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider block">Executable Binary Path</span>
                <span className="block font-mono text-slate-200 mt-1 break-all select-all font-semibold">
                  {selectedProc.exe_path || selectedProc.exe || 'Protected System Binary / Unavailable'}
                </span>
              </div>

              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 col-span-2">
                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider block">Execution Command Line</span>
                <div className="mt-1 break-all bg-slate-950 p-3 rounded-lg border border-slate-800 select-all text-[11px] leading-relaxed text-cyan-300">
                  {selectedProc.cmdline_str || selectedProc.exe_path || selectedProc.name}
                </div>
              </div>

              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider block">Parent Process (PPID)</span>
                <span className="block text-slate-200 mt-1 font-semibold">
                  {selectedProc.parent_name || 'N/A'} (PID: {selectedProc.ppid || 'None'})
                </span>
              </div>

              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider block">Execution Account</span>
                <span className="block text-slate-200 mt-1 font-semibold">
                  {selectedProc.username || 'System / NT AUTHORITY'}
                </span>
              </div>

              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider block">Process CPU Allocation</span>
                <span className="block text-base font-black text-cyan-400 mt-0.5">
                  {typeof selectedProc.cpu_percent === 'number' ? selectedProc.cpu_percent.toFixed(1) : 0}%
                </span>
              </div>

              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 font-bold uppercase text-[10px] tracking-wider block">Memory Utilization</span>
                <span className="block text-base font-black text-indigo-400 mt-0.5">
                  {typeof selectedProc.memory_percent === 'number' ? selectedProc.memory_percent.toFixed(1) : 0}% ({((selectedProc.memory_rss || 0) / (1024 * 1024)).toFixed(1)} MB)
                </span>
              </div>
            </div>

            {/* Risk & Heuristic Breakdown */}
            <div className="bg-amber-950/20 p-4 rounded-xl border border-amber-800/40">
              <h4 className="text-xs font-bold text-amber-300 mb-1 flex items-center gap-1.5 font-mono">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                SECURITY & ANOMALY ASSESSMENT
              </h4>
              <p className="text-xs text-amber-200/80 leading-relaxed font-sans font-medium">
                {selectedProc.risk_explanation || 'No malicious behavioral heuristics triggered. Process conforms to learned expectation.'}
              </p>
            </div>

            {/* Non-destructive notice */}
            <div className="text-[11px] text-slate-400 bg-slate-950/50 p-3 rounded-xl border border-slate-800/60">
              <span className="text-slate-300 font-semibold">Monitoring Safety Protocol:</span> Unfamiliar processes are never labeled malware automatically. Destructive process termination is prohibited by monitoring safety policies.
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedProc(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-mono font-bold transition-all border border-slate-700"
              >
                CLOSE INSPECTOR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessMonitor;
