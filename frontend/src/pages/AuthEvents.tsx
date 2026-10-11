import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tooltip } from '../components/common/Tooltip';
import {
  Shield, Key, AlertTriangle, CheckCircle,
  RefreshCw, Lock, UserCheck, ShieldAlert, User, ShieldX
} from 'lucide-react';
import axios from 'axios';
import { usePageCache } from '../hooks/useWebSocket';

export const AuthEvents: React.FC = () => {
  const pageCache = usePageCache();
  const [authData, setAuthData] = useState<any>(pageCache.authEvents || { status: 'Available', events: [] });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasDataRef = useRef(Boolean(pageCache.authEvents && (pageCache.authEvents.events?.length > 0 || pageCache.authEvents.status)));
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  // Sync with global cache immediately on update
  useEffect(() => {
    if (pageCache.authEvents) {
      hasDataRef.current = true;
      setAuthData(pageCache.authEvents);
    }
  }, [pageCache.authEvents]);

  const fetchAuthEvents = useCallback(async (isManual = false) => {
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
      const res = await axios.get('/api/security/auth-events', { signal: controller.signal });
      if (!mountedRef.current) return;
      hasDataRef.current = true;
      setAuthData(res.data);
    } catch (e: any) {
      if (e?.code === 'ERR_CANCELED') return;
      console.error('Error fetching auth events', e);
      if (mountedRef.current && !hasDataRef.current) {
        setError(e?.response?.data?.detail || e.message || 'Failed to retrieve authentication telemetry');
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
      fetchAuthEvents();
    }
    const interval = setInterval(() => fetchAuthEvents(false), 5000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchAuthEvents]);

  const isUnavailable = authData?.status === 'Unavailable on this system';
  const events = authData?.events || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Tactical Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0 shadow-glow-indigo/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-100 tracking-tight font-mono">
                  AUTHENTICATION & LOGON TELEMETRY
                </h1>
                <Tooltip content="Tracks logon sessions, failed logon spikes, and brute force credential attempts via OS-specific collectors." />
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Kernel Security Event Log telemetry (Windows Event IDs 4624/4625, Linux auth.log, macOS utmpx)
              </p>
            </div>
          </div>

          <button
            onClick={() => fetchAuthEvents(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/70 rounded-xl text-xs font-mono font-semibold transition-all shrink-0 hover:border-indigo-500/40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(loading || refreshing) ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
            <span>REFRESH EVENTS</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-950/30 border border-rose-800/60 text-rose-300 p-4 rounded-xl flex items-center justify-between text-xs font-mono">
          <span>{error}</span>
          <button
            onClick={() => fetchAuthEvents()}
            className="px-3 py-1 bg-rose-900/40 hover:bg-rose-900/70 rounded-lg border border-rose-700/60 font-semibold text-rose-200"
          >
            RETRY
          </button>
        </div>
      )}

      {isUnavailable ? (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-12 rounded-2xl text-center space-y-3 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-200 font-mono">Authentication Collector Inactive on Current Subsystem</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed font-sans font-medium">
            Direct OS Security Event Log parsing requires elevated privileges on this host or uses an unsupported authentication interface. Telemetry gracefully degrades without interrupting real-time monitoring.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/40">
            <span className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">Recorded Logon Sessions & Auth Events</span>
            <span className="text-[10px] font-mono text-slate-500">{events.length} Event Records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-mono font-bold border-b border-slate-800/80 text-[10px]">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Account / User Identity</th>
                  <th className="p-3.5">Security Event Type</th>
                  <th className="p-3.5">Logon Station / Source</th>
                  <th className="p-3.5 text-right">Auth Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {loading && !authData ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500 font-medium">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                        <span>Querying operating system authentication telemetry...</span>
                      </div>
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500 font-medium">
                      No recent authentication events detected.
                    </td>
                  </tr>
                ) : (
                  events.map((evt: any, idx: number) => {
                    const isSuccess = evt.result?.toLowerCase().includes('success') || evt.status?.toLowerCase().includes('success');
                    const isFailure = evt.result?.toLowerCase().includes('fail') || evt.status?.toLowerCase().includes('fail');

                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 text-slate-400">
                          {evt.timestamp ? new Date(evt.timestamp).toLocaleString() : 'Recent'}
                        </td>
                        <td className="p-3.5 font-bold text-slate-200 flex items-center gap-2 font-sans">
                          <div className="p-1 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-mono text-cyan-300">{evt.username || evt.user || 'SYSTEM'}</span>
                        </td>
                        <td className="p-3.5 text-slate-300 font-medium">
                          {evt.event_type || evt.type || 'Logon Session'}
                        </td>
                        <td className="p-3.5 text-slate-400">
                          {evt.source || evt.ip || 'Local Console (Interactive)'}
                        </td>
                        <td className="p-3.5 text-right font-sans">
                          {isFailure ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-mono font-bold">
                              <ShieldX className="w-3 h-3 text-rose-400" /> FAILED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                              <CheckCircle className="w-3 h-3 text-emerald-400" /> SUCCESS
                            </span>
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
      )}
    </div>
  );
};

export default AuthEvents;
