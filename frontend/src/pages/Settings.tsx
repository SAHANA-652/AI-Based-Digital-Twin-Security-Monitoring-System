import React, { useState, useEffect } from 'react';
import { Tooltip } from '../components/common/Tooltip';
import {
  Settings as SettingsIcon, Sliders, Database,
  Cpu, HardDrive, Shield, RefreshCw, CheckCircle, Radio
} from 'lucide-react';
import axios from 'axios';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [collectors, setCollectors] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchSettings = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      const [resSet, resCol] = await Promise.all([
        axios.get('/api/settings', { signal }),
        axios.get('/api/settings/collectors', { signal })
      ]);
      if (signal?.aborted) return;
      setSettings(resSet.data);
      setCollectors(resCol.data);
    } catch (e: any) {
      if (e?.code === 'ERR_CANCELED') return;
      console.error('Error fetching settings', e);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchSettings(controller.signal);
    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Tactical Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0 shadow-glow-cyan/20">
              <SettingsIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-100 tracking-tight font-mono">
                  ENGINE CONFIGURATION & SENSOR HEALTH
                </h1>
                <Tooltip content="Configurable telemetry sampling rates, risk contribution weights, and hardware collector diagnostics." />
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Engine hyperparameters, database retention policies, and cross-platform adapter status
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchSettings()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/70 rounded-xl text-xs font-mono font-semibold transition-all shrink-0 hover:border-cyan-500/40 active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>REFRESH DIAGNOSTICS</span>
          </button>
        </div>
      </div>

      {/* Collector Health Table */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Cpu className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-slate-100 tracking-tight font-mono">
            HARDWARE & OS TELEMETRY COLLECTOR STATUS
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-5 font-medium">
          Telemetry adapters detect host OS interfaces and gracefully degrade for unsupported sensors without crashing.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
          {Object.entries(collectors?.collectors || {
            cpu: true,
            memory: true,
            disk: true,
            network: true,
            process: true,
            temperature: false,
            battery: true,
            system_info: true,
            auth_events: true
          }).map(([name, isAvail]: [string, any], idx) => (
            <div key={idx} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-colors">
              <span className="font-semibold text-slate-300 capitalize">{name.replace('_', ' ')} Adapter</span>
              {isAvail ? (
                <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Available
                </span>
              ) : (
                <span className="bg-slate-800/60 text-slate-500 border border-slate-700/60 text-[10px] font-mono px-2 py-0.5 rounded-full">
                  Unavailable
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Risk Engine Weights Configuration */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Sliders className="w-4 h-4" />
          </div>
          <h2 className="text-base font-bold text-slate-100 tracking-tight font-mono">
            EXPLAINABLE RISK ENGINE CONTRIBUTION WEIGHTS
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-5 font-medium">
          Defines the proportional weighting of each evidence vector to the unified 0-100 Security Risk Score.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          {[
            { label: 'ML Anomaly Ensemble', weight: '25%' },
            { label: 'Digital Twin Deviation', weight: '20%' },
            { label: 'Process Execution', weight: '15%' },
            { label: 'Network Sockets', weight: '15%' },
            { label: 'Auth Telemetry', weight: '10%' },
            { label: 'Security Heuristics', weight: '10%' },
            { label: 'Threat Intelligence', weight: '5%' },
            { label: 'Sampling Cadence', weight: '1.0s (Live)' },
          ].map((item, idx) => (
            <div key={idx} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-1 hover:border-slate-700 transition-colors">
              <span className="text-slate-500 text-[10px] uppercase font-bold block tracking-wider">{item.label}</span>
              <span className="block text-xl font-black font-mono text-cyan-400 tracking-tight">{item.weight}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;
