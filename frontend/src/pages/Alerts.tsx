import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tooltip } from '../components/common/Tooltip';
import { StatusBadge } from '../components/common/StatusBadge';
import {
  Bell, ShieldAlert, CheckCircle, Filter,
  RefreshCw, Eye, AlertTriangle, ShieldCheck, X, Activity, Terminal
} from 'lucide-react';
import axios from 'axios';
import { usePageCache } from '../hooks/useWebSocket';

export const Alerts: React.FC = () => {
  const pageCache = usePageCache();
  const [alerts, setAlerts] = useState<any[]>(pageCache.alerts || []);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasDataRef = useRef(pageCache.alerts?.length > 0);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  // Helper for accurate UTC datetime display in user's local timezone
  const toLocalTimeString = (ts: string) => {
    if (!ts) return 'Recent';
    const utc = ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z';
    const d = new Date(utc);
    return isNaN(d.getTime()) ? new Date(ts).toLocaleString() : d.toLocaleString();
  };

  // Sync with global cache immediately on update
  useEffect(() => {
    if (pageCache.alerts && pageCache.alerts.length > 0) {
      hasDataRef.current = true;
      setAlerts(pageCache.alerts);
    }
  }, [pageCache.alerts]);

  const fetchAlerts = useCallback(async (isManual = false) => {
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
      const res = await axios.get('/api/alerts', { signal: controller.signal });
      if (!mountedRef.current) return;
      if (Array.isArray(res.data)) {
        hasDataRef.current = true;
        setAlerts(res.data);
      }
    } catch (e: any) {
      if (e?.code === 'ERR_CANCELED') return;
      console.error('Error fetching alerts', e);
      if (mountedRef.current && !hasDataRef.current) {
        setError(e?.response?.data?.detail || e.message || 'Failed to retrieve security alerts');
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
      fetchAlerts();
    }
    const interval = setInterval(() => fetchAlerts(false), 5000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchAlerts]);

  const updateStatus = async (id: number, status: string) => {
    try {
      await axios.put(`/api/alerts/${id}/status`, { status, resolved_by: 'admin' });
      fetchAlerts();
      if (selectedAlert?.id === id) {
        setSelectedAlert((prev: any) => ({ ...prev, status }));
      }
    } catch (e) {
      console.error('Error updating alert status', e);
    }
  };

  const filtered = alerts.filter((a) => {
    if (filterSeverity === 'ALL') return true;
    return (a.severity || '').toUpperCase() === filterSeverity;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Tactical Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 shadow-glow-amber/20">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-100 tracking-tight font-mono">
                  SECURITY ALERTS & INCIDENT TRIAGE
                </h1>
                <Tooltip content="Alerts are triggered when multi-signal risk scores cross critical thresholds or explicit heuristics fire. Never modifies your operating system." />
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Explainable evidence triage with investigation workflows and false-positive feedback loops
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono font-semibold text-slate-300 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            >
              <option value="ALL">ALL SEVERITIES</option>
              <option value="CRITICAL">CRITICAL ONLY</option>
              <option value="HIGH">HIGH ONLY</option>
              <option value="MODERATE">MODERATE ONLY</option>
              <option value="LOW">LOW ONLY</option>
            </select>

            <button
              onClick={() => fetchAlerts(true)}
              disabled={loading || refreshing}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/70 rounded-xl text-xs font-mono font-semibold transition-all shrink-0 hover:border-amber-500/40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${(loading || refreshing) ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
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
            onClick={() => fetchAlerts()}
            className="px-3 py-1 bg-rose-900/40 hover:bg-rose-900/70 rounded-lg border border-rose-700/60 font-semibold text-rose-200"
          >
            RETRY
          </button>
        </div>
      )}

      {/* Alerts Table */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/40">
          <span className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">Recorded Behavioral Security Incidents</span>
          <span className="text-[10px] font-mono text-slate-500">{filtered.length} Incident Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-mono font-bold border-b border-slate-800/80 text-[10px]">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Severity</th>
                <th className="p-3.5">Risk Score</th>
                <th className="p-3.5">Alert Vector / Title</th>
                <th className="p-3.5">Triage Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading && alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Querying recorded security incident logs...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 font-medium">
                    No active alerts matching the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((alert) => (
                  <tr
                    key={alert.id}
                    className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedAlert(alert)}
                  >
                    <td className="p-3.5 text-slate-400 font-mono">
                      {toLocalTimeString(alert.timestamp)}
                    </td>
                    <td className="p-3.5 font-sans">
                      <StatusBadge status={alert.severity as any} />
                    </td>
                    <td className="p-3.5 font-bold text-amber-400">
                      {alert.risk_score}/100
                    </td>
                    <td className="p-3.5 font-bold text-slate-100 font-sans">
                      {alert.title}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        alert.status === 'Resolved'
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
                          : alert.status === 'Acknowledged'
                          ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800/50'
                          : 'bg-slate-800 text-slate-300 border-slate-700/60'
                      }`}>
                        {alert.status || 'New'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-sans">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAlert(alert);
                        }}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 rounded-lg border border-slate-700 hover:border-cyan-500/50 text-[11px] font-mono font-bold transition-all shadow-sm"
                      >
                        INVESTIGATE
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alert Investigation Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-2xl relative text-slate-200">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            <button
              onClick={() => setSelectedAlert(null)}
              className="absolute right-5 top-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 border-b border-slate-800 pb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 tracking-tight font-mono">{selectedAlert.title}</h3>
                <p className="text-xs text-slate-400 font-mono">Incident ID: #{selectedAlert.id} • Risk Score: {selectedAlert.risk_score}/100</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs font-mono">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <span className="font-bold text-cyan-400 uppercase text-[10px] tracking-wider block mb-1">INCIDENT EXPLANATION:</span>
                <p className="text-slate-300 leading-relaxed font-sans font-medium text-xs">{selectedAlert.description}</p>
              </div>

              {selectedAlert.evidence && (
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                  <span className="font-bold text-cyan-400 uppercase text-[10px] tracking-wider block mb-2">CORRELATED TELEMETRY EVIDENCE:</span>
                  <pre className="font-mono text-[11px] text-cyan-300 overflow-x-auto bg-slate-950 p-3 rounded-lg border border-slate-800 leading-relaxed max-h-56">
                    {JSON.stringify(selectedAlert.evidence, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800 font-mono text-xs">
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold border border-slate-700 transition-all"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;
