import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tooltip } from '../components/common/Tooltip';
import {
  Clock, ShieldAlert, Zap, Cpu, Network,
  RefreshCw, CheckCircle2, AlertTriangle, Layers, Radio
} from 'lucide-react';
import axios from 'axios';
import { usePageCache } from '../hooks/useWebSocket';

export const SecurityTimeline: React.FC = () => {
  const pageCache = usePageCache();
  const [timeline, setTimeline] = useState<any[]>(pageCache.timeline || []);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasDataRef = useRef(pageCache.timeline?.length > 0);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  // Accurate UTC to Local Time formatter
  const toLocalTimeString = (ts: string) => {
    if (!ts) return 'Recent';
    const utc = ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z';
    const d = new Date(utc);
    return isNaN(d.getTime()) ? new Date(ts).toLocaleString() : d.toLocaleString();
  };

  // Sync with global cache immediately on update
  useEffect(() => {
    if (pageCache.timeline && pageCache.timeline.length > 0) {
      hasDataRef.current = true;
      setTimeline(pageCache.timeline);
    }
  }, [pageCache.timeline]);

  const fetchTimeline = useCallback(async (isManual = false) => {
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
      const res = await axios.get('/api/security/timeline', { signal: controller.signal });
      if (!mountedRef.current) return;
      if (Array.isArray(res.data)) {
        hasDataRef.current = true;
        setTimeline(res.data);
      }
    } catch (e: any) {
      if (e?.code === 'ERR_CANCELED') return;
      console.error('Error fetching timeline', e);
      if (mountedRef.current && !hasDataRef.current) {
        setError(e?.response?.data?.detail || e.message || 'Failed to retrieve security timeline');
      }
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!hasDataRef.current) {
      fetchTimeline();
    }
    const interval = setInterval(() => fetchTimeline(false), 5000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchTimeline]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Tactical Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0 shadow-glow-cyan/20">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-100 tracking-tight font-mono">
                  SECURITY FORENSIC TIMELINE
                </h1>
                <Tooltip content="Chronological sequence of security anomalies, ML inferences, and baseline adaptations." />
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Correlated incident telemetry stream with chronological evidence tracking
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchTimeline(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/70 rounded-xl text-xs font-mono font-semibold transition-all shrink-0 hover:border-cyan-500/40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loading || refreshing) ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
            <span>REFRESH TIMELINE</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-950/30 border border-rose-800/60 text-rose-300 p-4 rounded-xl flex items-center justify-between text-xs font-mono">
          <span>{error}</span>
          <button
            onClick={() => fetchTimeline(true)}
            className="px-3 py-1 bg-rose-900/40 hover:bg-rose-900/70 rounded-lg border border-rose-700/60 font-semibold text-rose-200"
          >
            RETRY
          </button>
        </div>
      )}

      {/* Timeline Stream */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">Chronological Incident Audit</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500">{timeline.length} Recorded Events</span>
        </div>

        {loading && timeline.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            <span className="text-sm font-mono font-medium">Reconstructing forensic security timeline...</span>
          </div>
        ) : timeline.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold font-mono text-slate-200">No Security Events Recorded Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-sans font-medium">
              Real behavioral anomalies, heuristic triggers, and active simulations will be automatically logged and sequenced here.
            </p>
          </div>
        ) : (
          <div className="relative border-l-2 border-cyan-500/20 ml-4 space-y-6">
            {timeline.map((event, idx) => {
              const isHigh = event.severity === 'High' || event.severity === 'Critical';
              const timeStr = toLocalTimeString(event.timestamp);

              return (
                <div key={idx} className="relative pl-6">
                  {/* Glowing Node Dot */}
                  <div
                    className={`absolute -left-[9px] top-2 w-4 h-4 rounded-full border-2 border-slate-900 shadow-md transition-all ${
                      isHigh
                        ? 'bg-rose-500 shadow-rose-500/50 ring-4 ring-rose-500/20'
                        : 'bg-cyan-500 shadow-cyan-500/50 ring-4 ring-cyan-500/20'
                    }`}
                  />

                  <div className="bg-slate-950/60 hover:bg-slate-950/80 p-5 rounded-2xl border border-slate-800/80 space-y-2.5 transition-all hover:border-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-mono">
                        {event.title}
                        {event.is_simulation && (
                          <span className="text-[10px] uppercase font-mono font-bold bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                            SIMULATION
                          </span>
                        )}
                      </h3>
                      <span className="font-mono text-[11px] text-cyan-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 font-semibold">
                        {timeStr}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans font-medium">
                      {event.description}
                    </p>

                    {event.evidence && (
                      <div className="mt-3 text-[11px] font-mono bg-slate-950 p-3.5 rounded-xl text-cyan-300 border border-slate-800 leading-relaxed max-h-48 overflow-y-auto">
                        <span className="text-slate-500 font-bold uppercase text-[10px] block mb-1">TELEMETRIC EVIDENCE:</span>
                        {typeof event.evidence === 'string'
                          ? event.evidence
                          : JSON.stringify(event.evidence, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityTimeline;
