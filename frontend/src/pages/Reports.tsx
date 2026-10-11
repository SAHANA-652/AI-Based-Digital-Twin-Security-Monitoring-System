import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Tooltip } from '../components/common/Tooltip';
import {
  FileText, Download, ShieldCheck,
  Calendar, CheckCircle, Clock, AlertTriangle,
  Server, Cpu, Activity, ShieldAlert, Zap, RefreshCw, Radio
} from 'lucide-react';
import axios from 'axios';

// Module-level report cache across page navigation
let cachedReport: any = null;

export const Reports: React.FC = () => {
  const [hours, setHours] = useState(24);
  const [report, setReport] = useState<any>(cachedReport);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  const handleGenerate = useCallback(async (selectedHours = hours) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const controller = new AbortController();

    try {
      if (!cachedReport) {
        setGenerating(true);
      }
      setError(null);
      const res = await axios.post('/api/reports/generate', {
        title: 'Comprehensive Host Security & Digital Twin Audit Report',
        hours: selectedHours
      }, { signal: controller.signal });
      if (!mountedRef.current) return;
      cachedReport = res.data;
      setReport(res.data);
    } catch (e: any) {
      if (e?.code === 'ERR_CANCELED') return;
      console.error('Error generating report', e);
      if (mountedRef.current && !cachedReport) {
        setError(e?.response?.data?.detail || e.message || 'Failed to compile security report from database');
      }
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setGenerating(false);
    }
  }, [hours]);

  useEffect(() => {
    mountedRef.current = true;
    if (!cachedReport) {
      handleGenerate(24);
    }
    return () => {
      mountedRef.current = false;
    };
  }, [handleGenerate]);

  const handleDownloadPDF = () => {
    if (!report) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${report.title} - ${report.report_id}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; background: #fff; }
            .header { border-bottom: 2px solid #0284c7; padding-bottom: 20px; margin-bottom: 24px; }
            .badge { display: inline-block; padding: 4px 10px; background: #0284c7; color: white; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; font-family: monospace; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 12px 0 24px 0; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 8px; }
            .title { font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
            .val { font-size: 16px; font-weight: bold; color: #0f172a; margin-top: 4px; font-family: monospace; }
            h2 { font-size: 14px; font-weight: 800; color: #334155; text-transform: uppercase; margin: 20px 0 8px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 24px; font-size: 12px; font-family: monospace; }
            th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
            th { background: #f1f5f9; color: #475569; font-weight: 700; }
            .recommendation { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 10px 14px; margin-bottom: 8px; font-size: 12px; color: #166534; border-radius: 0 4px 4px 0; }
            @media print { body { padding: 0; } button { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <span class="badge">${report.data_classification || 'REAL TELEMETRY'}</span>
            <h1 style="margin: 12px 0 4px 0; color: #0f172a; font-size: 22px;">${report.title}</h1>
            <p style="margin: 0; color: #64748b; font-size: 12px;">Report ID: ${report.report_id} | Generated: ${new Date(report.generated_at).toLocaleString()}</p>
            <p style="margin: 0; color: #64748b; font-size: 12px;">Monitoring Period: ${report.monitoring_period}</p>
          </div>

          <h2>1. Host System Environment</h2>
          <div class="grid">
            <div class="card"><div class="title">Hostname</div><div class="val">${report.system_info?.hostname || 'Localhost'}</div></div>
            <div class="card"><div class="title">Operating System</div><div class="val">${report.system_info?.os_name || 'Windows'}</div></div>
            <div class="card"><div class="title">Processor Cores</div><div class="val">${report.system_info?.cpu_cores || 'Multi-Core'}</div></div>
            <div class="card"><div class="title">Physical Memory & Battery</div><div class="val">${report.system_info?.total_ram_gb || 16} GB RAM | ${report.system_info?.battery_status || 'AC Power'}</div></div>
          </div>

          <h2>2. Security Risk & Behavioral Classification</h2>
          <div class="grid">
            <div class="card"><div class="title">Current Security Risk Score</div><div class="val">${report.risk_summary?.current_score || 0}/100 (${report.risk_summary?.current_level || 'Normal'})</div></div>
            <div class="card"><div class="title">Behavioral Classification</div><div class="val">${report.risk_summary?.classification || 'Normal Host Operation'}</div></div>
            <div class="card"><div class="title">Average / Peak Risk</div><div class="val">Avg: ${report.risk_summary?.average_score || 0} | Peak: ${report.risk_summary?.peak_score || 0}</div></div>
            <div class="card"><div class="title">Total Recorded Alerts</div><div class="val">${report.alerts_summary?.total_alerts || 0} alerts</div></div>
          </div>

          <h2>3. Telemetry & Hardware Workload</h2>
          <div class="grid">
            <div class="card"><div class="title">Average CPU Load</div><div class="val">${report.telemetry_summary?.average_cpu_percent || 0}% (Peak: ${report.telemetry_summary?.peak_cpu_percent || 0}%)</div></div>
            <div class="card"><div class="title">Average RAM Load</div><div class="val">${report.telemetry_summary?.average_ram_percent || 0}% (Peak: ${report.telemetry_summary?.peak_ram_percent || 0}%)</div></div>
            <div class="card"><div class="title">Active Processes Tracked</div><div class="val">${report.telemetry_summary?.total_active_processes || 0} procs</div></div>
            <div class="card"><div class="title">Active Network Sockets</div><div class="val">${report.telemetry_summary?.total_active_sockets || 0} connections</div></div>
          </div>

          ${report.top_processes && report.top_processes.length > 0 ? `
            <h2>4. Top Resource Consuming Processes</h2>
            <table>
              <thead><tr><th>PID</th><th>Process Name</th><th>CPU %</th><th>RAM %</th><th>User</th></tr></thead>
              <tbody>
                ${report.top_processes.map((p: any) => `
                  <tr><td>${p.pid}</td><td><b>${p.name}</b></td><td>${Number(p.cpu_percent || 0).toFixed(1)}%</td><td>${Number(p.memory_percent || 0).toFixed(1)}%</td><td>${p.username || 'System'}</td></tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}

          <h2>5. Actionable Security Recommendations</h2>
          ${(report.recommendations || []).map((r: string) => `
            <div class="recommendation">✓ ${r}</div>
          `).join('')}

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Tactical Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 shadow-2xl print:hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0 shadow-glow-cyan/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-100 tracking-tight font-mono">
                  SECURITY REPORTING & EXECUTIVE AUDITS
                </h1>
                <Tooltip content="Generates technical audit reports distinguishing REAL TELEMETRY from SIMULATED TELEMETRY." />
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Exportable security compliance, ML anomaly assessments, and behavioral deviation summaries
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-mono text-slate-400 font-semibold">AUDIT RANGE:</span>
            <select
              value={hours}
              onChange={(e) => {
                const h = Number(e.target.value);
                setHours(h);
                handleGenerate(h);
              }}
              className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono font-semibold text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            >
              <option value={1}>LAST 1 HOUR</option>
              <option value={24}>LAST 24 HOURS</option>
              <option value={168}>LAST 7 DAYS</option>
              <option value={720}>LAST 30 DAYS</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-950/30 border border-rose-800/60 text-rose-300 p-4 rounded-xl flex items-center justify-between text-xs font-mono print:hidden">
          <span>{error}</span>
          <button
            onClick={() => handleGenerate(hours)}
            className="px-3 py-1 bg-rose-900/40 hover:bg-rose-900/70 text-rose-200 rounded-lg border border-rose-700/60 font-semibold"
          >
            RETRY
          </button>
        </div>
      )}

      {/* Loading State */}
      {generating && !report && (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-16 text-center shadow-2xl">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-200 font-mono">Compiling Security & Audit Report...</h3>
          <p className="text-xs text-slate-400 mt-1">Aggregating real hardware telemetry, process tables, and alert logs from SQLite database.</p>
        </div>
      )}

      {/* Generated Report View */}
      {report ? (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl space-y-7">
          {/* Report Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="flex items-center gap-2.5">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                  report.is_simulation
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                    : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                }`}>
                  {report.data_classification || 'REAL TELEMETRY'}
                </span>
                <span className="text-xs text-slate-500 font-mono">REPORT ID: #{report.report_id}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-100 mt-2 tracking-tight font-mono">{report.title}</h2>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-mono">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                Period: {report.monitoring_period} | Compiled: {new Date(report.generated_at).toLocaleString()}
              </p>
            </div>

            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-mono font-bold border border-slate-700 hover:border-cyan-500/40 transition-all active:scale-95 shadow-lg print:hidden"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>EXPORT PRINTABLE PDF</span>
            </button>
          </div>

          {/* Section 1: Host System & Hardware Architecture */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" /> 1. HOST ENVIRONMENT ARCHITECTURE
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase block tracking-wider font-bold">Hostname</span>
                <span className="block font-bold text-slate-200 truncate">{report.system_info?.hostname || 'Localhost'}</span>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase block tracking-wider font-bold">Operating System</span>
                <span className="block font-bold text-slate-200 truncate">{report.system_info?.os_name || 'Windows'}</span>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase block tracking-wider font-bold">CPU Topology</span>
                <span className="block font-bold text-slate-200">{report.system_info?.cpu_cores || 'Multi-Core'} Logical Cores</span>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase block tracking-wider font-bold">RAM & Power</span>
                <span className="block font-bold text-slate-200 truncate">{report.system_info?.total_ram_gb || 16} GB RAM | {report.system_info?.battery_status || 'AC Power'}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Executive Security & Risk Summary */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" /> 2. SECURITY RISK ASSESSMENT
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase block tracking-wider font-bold">Security Risk Score</span>
                <span className="block text-2xl font-black text-amber-400 tracking-tight">
                  {report.risk_summary?.current_score || 0}/100 ({report.risk_summary?.current_level || 'Normal'})
                </span>
                <p className="text-[11px] text-slate-500">Average: {report.risk_summary?.average_score} | Peak: {report.risk_summary?.peak_score}</p>
              </div>

              <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase block tracking-wider font-bold">Behavioral Classification</span>
                <span className="block text-xl font-bold text-emerald-400 tracking-tight">
                  {report.risk_summary?.classification || 'Normal Host Operation'}
                </span>
                <p className="text-[11px] text-slate-500">Conforming to statistical baseline</p>
              </div>

              <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase block tracking-wider font-bold">Total Recorded Incidents</span>
                <span className="block text-2xl font-black text-cyan-400 tracking-tight">
                  {report.alerts_summary?.total_alerts || 0} incidents
                </span>
                <p className="text-[11px] text-slate-500">Across selected audit period</p>
              </div>
            </div>
          </div>

          {/* Section 3: Telemetry Statistics */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" /> 3. HOST WORKLOAD & TELEMETRY SUMMARY
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase block tracking-wider font-bold">Average CPU Load</span>
                <span className="block font-bold text-cyan-400">{report.telemetry_summary?.average_cpu_percent}% (Peak: {report.telemetry_summary?.peak_cpu_percent}%)</span>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase block tracking-wider font-bold">Average RAM Load</span>
                <span className="block font-bold text-indigo-400">{report.telemetry_summary?.average_ram_percent}% (Peak: {report.telemetry_summary?.peak_ram_percent}%)</span>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase block tracking-wider font-bold">Active Processes</span>
                <span className="block font-bold text-slate-200">{report.telemetry_summary?.total_active_processes} tracked</span>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-slate-500 text-[10px] uppercase block tracking-wider font-bold">Active Sockets</span>
                <span className="block font-bold text-slate-200">{report.telemetry_summary?.total_active_sockets} connections</span>
              </div>
            </div>
          </div>

          {/* Section 4: Top Processes */}
          {report.top_processes && report.top_processes.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" /> 4. TOP RESOURCE CONSUMING PROCESSES
              </h3>
              <div className="overflow-x-auto border border-slate-800/80 rounded-xl bg-slate-950/40">
                <table className="w-full text-left text-xs text-slate-300 font-mono">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">PID</th>
                      <th className="p-3">Process Name</th>
                      <th className="p-3">CPU %</th>
                      <th className="p-3">RAM %</th>
                      <th className="p-3">Account</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {report.top_processes.map((p: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 text-cyan-400 font-bold">{p.pid}</td>
                        <td className="p-3 font-semibold text-slate-200 font-sans">{p.name}</td>
                        <td className="p-3 font-bold text-cyan-400">{p.cpu_percent?.toFixed(1)}%</td>
                        <td className="p-3 font-bold text-indigo-400">{p.memory_percent?.toFixed(1)}%</td>
                        <td className="p-3 text-slate-400">{p.username || 'System'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 5: Security Recommendations */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> 5. ACTIONABLE SECURITY RECOMMENDATIONS
            </h3>
            <ul className="space-y-2 text-xs">
              {report.recommendations?.map((rec: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3 bg-emerald-950/20 border border-emerald-800/40 p-3.5 rounded-xl text-emerald-200/90 font-sans font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-16 rounded-2xl text-center space-y-3 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-200 font-mono">No Audit Report Generated Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed font-sans font-medium">
            Click "Regenerate Audit" above to compile a comprehensive security and telemetry audit for the selected timeframe.
          </p>
        </div>
      )}
    </div>
  );
};

export default Reports;
