import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tooltip } from '../components/common/Tooltip';
import {
  Zap, Play, Square, AlertTriangle, ShieldCheck,
  Cpu, HardDrive, Wifi, Lock, Activity, Info, ShieldAlert,
  Sliders, ArrowRight, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { usePageCache } from '../hooks/useWebSocket';

export const AttackSimulator: React.FC = () => {
  const pageCache = usePageCache();
  const [scenarios, setScenarios] = useState<any[]>(pageCache.scenarios || []);
  const [selectedScenario, setSelectedScenario] = useState('cryptomining');
  const [simStatus, setSimStatus] = useState<any>({ is_active: false, mode: 'LIVE' });
  const [loading, setLoading] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customCpu, setCustomCpu] = useState(90);
  const [customRam, setCustomRam] = useState(85);
  const [customNet, setCustomNet] = useState(50);
  const mountedRef = useRef(true);
  const statusInFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (pageCache.scenarios && pageCache.scenarios.length > 0) {
      setScenarios(pageCache.scenarios);
    }
  }, [pageCache.scenarios]);

  const fetchScenarios = useCallback(async () => {
    try {
      const res = await axios.get('/api/simulation/scenarios');
      if (mountedRef.current && Array.isArray(res.data)) {
        setScenarios(res.data);
      }
    } catch (e) {
      console.debug('Scenario list fetch non-critical:', e);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    if (statusInFlightRef.current) return;
    statusInFlightRef.current = true;
    abortRef.current = new AbortController();

    try {
      setError(null);
      const resStatus = await axios.get('/api/simulation/status', { signal: abortRef.current.signal });
      if (!mountedRef.current) return;
      setSimStatus(resStatus.data);
      if (resStatus.data?.is_active && (resStatus.data?.scenario_name || resStatus.data?.scenario_type)) {
        setSelectedScenario(resStatus.data.scenario_name || resStatus.data.scenario_type);
      }
    } catch (e: any) {
      if (e?.code === 'ERR_CANCELED') return;
      console.error('Error fetching simulation status', e);
      if (mountedRef.current) {
        setError(e?.response?.data?.detail || e.message || 'Failed to sync simulation state');
      }
    } finally {
      statusInFlightRef.current = false;
      abortRef.current = null;
      if (mountedRef.current) {
        setInitialLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchScenarios();
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [fetchScenarios, fetchStatus]);

  const handleStart = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = selectedScenario === 'custom' ? {
        cpu_percent: customCpu,
        ram_percent: customRam,
        net_upload_rate: customNet * 1024 * 1024
      } : {};

      await axios.post('/api/simulation/start', {
        scenario: selectedScenario,
        parameters: params
      });
      await fetchStatus();
    } catch (e: any) {
      console.error('Error starting simulation', e);
      setError(e?.response?.data?.detail || e.message || 'Failed to launch synthetic simulation');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      setStopping(true);
      setError(null);
      await axios.post('/api/simulation/stop');
      await fetchStatus();
    } catch (e: any) {
      console.error('Error stopping simulation', e);
      setError(e?.response?.data?.detail || e.message || 'Failed to stop simulation');
    } finally {
      setStopping(false);
    }
  };

  const isSimActive = simStatus.is_active || simStatus.mode === 'SIMULATION';

  const scenarioList = [
    {
      id: 'cryptomining',
      name: 'Cryptomining-like Load',
      desc: 'Simulates 90%+ sustained CPU saturation, elevated thermal metrics, and power surges.',
      icon: Cpu,
      impact: 'CPU 92% • Low Network'
    },
    {
      id: 'network_flood',
      name: 'Network Flood / DDoS-like',
      desc: 'Simulates sudden outbound packet bursts, socket flooding, and massive bandwidth saturation.',
      icon: Wifi,
      impact: 'High Bandwidth • Heavy Socket Allocation'
    },
    {
      id: 'brute_force',
      name: 'Brute Force Authentication Spikes',
      desc: 'Simulates rapid failed login attempts and automated credential spraying across target accounts.',
      icon: Lock,
      impact: 'Rapid Authentication Failures • Credential Spraying Surge'
    },
    {
      id: 'data_exfiltration',
      name: 'Data Exfiltration Bursts',
      desc: 'Simulates heavy outbound data streams directed to unverified external foreign IP addresses.',
      icon: Wifi,
      impact: 'Outbound TX Spike • New External IP'
    },
    {
      id: 'ransomware',
      name: 'Ransomware-like File Activity',
      desc: 'Simulates rapid file read/write iterations and disk I/O burst pressure (synthetic only).',
      icon: HardDrive,
      impact: 'Disk Write Burst • High Frequency I/O'
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Simulation Command Banner */}
      <div className={`relative overflow-hidden rounded-2xl border p-6 shadow-2xl transition-all ${
        isSimActive
          ? 'bg-amber-950/30 border-amber-500/50 text-slate-100 shadow-glow-amber/20'
          : 'bg-slate-900/60 backdrop-blur-xl border-slate-800/80 text-slate-100'
      }`}>
        <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none ${
          isSimActive ? 'bg-amber-500/10' : 'bg-cyan-500/5'
        }`} />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-xl border shrink-0 ${
              isSimActive
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-glow-cyan/20'
            }`}>
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight font-mono">
                  ATTACK SIMULATION LABORATORY
                </h1>
                <Tooltip content="Modifies synthetic telemetry in-memory only. NEVER modifies real processes, disk files, network connections, or operating system configuration." />
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Test Digital Twin statistical deviations, 4-model ML ensembles, and alert rules without endangering host stability
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
            {isSimActive ? (
              <div className="flex items-center gap-3">
                <span className="px-3.5 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold rounded-full text-xs tracking-wider animate-pulse flex items-center gap-1.5 shadow-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  SIMULATION ACTIVE: {simStatus.scenario_name || selectedScenario}
                </span>
                <button
                  onClick={handleStop}
                  disabled={stopping}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-mono font-bold shadow-lg shadow-rose-600/30 transition-all active:scale-95"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>{stopping ? 'TERMINATING...' : 'ABORT SIMULATION'}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold rounded-full text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  SAFE LIVE REPLICA MODE
                </span>
                <button
                  onClick={handleStart}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl text-xs font-mono font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{loading ? 'DEPLOYING...' : 'LAUNCH SIMULATION'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-950/30 border border-rose-800/60 text-rose-300 p-4 rounded-xl flex items-center justify-between text-xs font-mono">
          <span>{error}</span>
          <button
            onClick={fetchStatus}
            className="px-3 py-1 bg-rose-900/40 hover:bg-rose-900/70 rounded-lg border border-rose-700/60 font-semibold text-rose-200"
          >
            RETRY
          </button>
        </div>
      )}

      {/* Safety & Pipeline Progression Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Safety Guarantees Card */}
        <div className="p-5 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-xl flex items-start gap-3.5 text-xs text-slate-300">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold font-mono text-slate-100 uppercase tracking-wider block mb-1">
              Zero-Impact Synthetic Isolation
            </span>
            <p className="text-slate-400 leading-relaxed font-sans font-medium text-[11px]">
              Simulations alter synthetic in-memory telemetry tensors fed directly into the Digital Twin statistical comparator and ML models. No host files, system processes, or registry configurations are touched. Aborting returns telemetry to live real-time values instantly.
            </p>
          </div>
        </div>

        {/* Pipeline Progression View */}
        <div className="p-5 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-xl flex flex-col justify-between text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold font-mono text-slate-100 uppercase tracking-wider text-[11px]">
              Synthetic Evaluation Pipeline
            </span>
            <span className="text-[10px] font-mono text-cyan-400">Deterministic Path</span>
          </div>
          <div className="flex items-center justify-between gap-1 text-[10px] font-mono py-1.5 overflow-x-auto">
            <div className="px-2 py-1 bg-slate-800 text-slate-300 rounded border border-slate-700 shrink-0">Vector Inject</div>
            <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
            <div className="px-2 py-1 bg-slate-800 text-slate-300 rounded border border-slate-700 shrink-0">Twin Delta</div>
            <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
            <div className="px-2 py-1 bg-slate-800 text-slate-300 rounded border border-slate-700 shrink-0">ML 4-Model</div>
            <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
            <div className="px-2 py-1 bg-slate-800 text-slate-300 rounded border border-slate-700 shrink-0">Alert Dispatch</div>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">Real-time simulation cycle: 1000ms refresh tick</div>
        </div>
      </div>

      {/* Attack Scenarios Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            Select Synthetic Attack Vector
          </h2>
          <span className="text-xs font-mono text-slate-500">{scenarioList.length} Pre-calibrated Profiles</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarioList.map((item) => {
            const isSelected = selectedScenario === item.id;
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => !isSimActive && setSelectedScenario(item.id)}
                className={`relative overflow-hidden p-5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-950/25 border-amber-500/60 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-900/60 backdrop-blur-xl border-slate-800/80 hover:border-slate-700/80'
                } ${isSimActive ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl border ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700/60'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {isSelected && (
                    <span className="text-[10px] uppercase font-mono font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40">
                      ARMED
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-100 font-mono tracking-tight">{item.name}</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans font-medium">{item.desc}</p>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Target Telemetry:</span>
                  <span className="text-slate-300 font-semibold">{item.impact}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AttackSimulator;
