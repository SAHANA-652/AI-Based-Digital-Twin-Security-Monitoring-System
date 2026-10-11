import React, { useState } from 'react';
import { Tooltip } from '../components/common/Tooltip';
import {
  Search, ShieldCheck, ShieldAlert, Globe, Hash,
  Terminal, CheckCircle, HelpCircle, Info, Database, Radio
} from 'lucide-react';
import axios from 'axios';

export const ThreatIntelligence: React.FC = () => {
  const [indicator, setIndicator] = useState('');
  const [type, setType] = useState('ip');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentLookups, setRecentLookups] = useState<any[]>([]);
  const exampleIps = [
    '8.8.8.8',
    '1.1.1.1',
    '203.0.113.100',
    '185.220.101.5',
    '185.220.101.2',
    '193.47.62.69',
    '66.132.195.57',
  ];

  const exampleDomains = [
    'malware-c2-traffic.net',
    'cobalt-strike-beacon.org',
    'phish-auth-update.xyz',
    'google.com',
    'cloudflare.com',
  ];

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!indicator) return;

    try {
      setLoading(true);
      setError('');
      const cleanIndicator = indicator.trim();
      const endpoint = type === 'domain'
        ? `/api/threat-intel/domain/${encodeURIComponent(cleanIndicator)}`
        : `/api/threat-intel/ip/${encodeURIComponent(cleanIndicator)}`;
      const res = await axios.get(endpoint);
      setResult(res.data);
      setRecentLookups((prev) => [res.data, ...prev.slice(0, 9)]);
    } catch (e: any) {
      const detail = e.response?.data?.detail || e.message || 'Threat-intelligence request failed.';
      setResult(null);
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0 shadow-glow-cyan/20">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-100 tracking-tight font-mono">
                  THREAT INTELLIGENCE & REPUTATION WORKSTATION
                </h1>
                <Tooltip content="Checks IP and domain reputation through external threat feeds from the secure backend." />
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Live reputation queries and indicator confidence analysis across global feeds
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-full text-xs font-mono font-bold uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            Live Threat Feeds Connected
          </div>
        </div>
      </div>

      {/* Query Form Card */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 sm:p-7 rounded-2xl shadow-2xl relative overflow-hidden">
        <form onSubmit={handleLookup} className="space-y-4 relative z-10">
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setIndicator('');
                setError('');
              }}
              className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-300 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            >
              <option value="ip">IPv4 / IPv6 Target</option>
              <option value="domain">Domain Target (FQDN)</option>
            </select>

            <input
              type="text"
              placeholder={
                type === 'domain'
                  ? 'Query domain target (e.g. malware-c2-traffic.net, google.com)...'
                  : 'Query IP address (e.g. 185.220.101.5, 203.0.113.100, 8.8.8.8)...'
              }
              value={indicator}
              onChange={(e) => setIndicator(e.target.value)}
              className="flex-1 bg-slate-950/70 border border-slate-800/90 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 font-mono transition-all"
            />

            <button
              type="submit"
              disabled={loading || !indicator}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-mono font-bold shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 shrink-0 active:scale-95"
            >
              <Search className="w-3.5 h-3.5 text-slate-950" />
              <span>{loading ? 'QUERYING FEED...' : 'EXECUTE INTEL QUERY'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="text-slate-500 font-semibold text-[11px]">CALIBRATED SAMPLES:</span>
            {(type === 'domain' ? exampleDomains : exampleIps).map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setIndicator(example)}
                className="px-2.5 py-1 bg-slate-800/70 hover:bg-cyan-500/10 hover:text-cyan-300 hover:border-cyan-500/40 border border-slate-700/60 rounded-lg text-slate-300 font-mono text-[11px] transition-all"
              >
                {example}
              </button>
            ))}
          </div>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-rose-950/30 border border-rose-800/60 rounded-xl text-xs font-mono text-rose-300">
            {error}
          </div>
        )}

        {/* Result Card */}
        {result && (
          <div className="mt-6 pt-6 border-t border-slate-800/80">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">THREAT TELEMETRY RESULT</span>
                <h3 className="text-xl font-black text-cyan-400 mt-0.5 font-mono tracking-tight">{result.indicator}</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">Type: {result.type} • Intel Provider: {result.provider || result.source || 'Threat Feed'}</p>
              </div>

              {result.threat_status === 'MALICIOUS' ? (
                <span className="px-3.5 py-1.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm shadow-rose-500/20">
                  <ShieldAlert className="w-4 h-4 text-rose-400" /> MALICIOUS INDICATOR
                </span>
              ) : result.threat_status === 'SUSPICIOUS' ? (
                <span className="px-3.5 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm shadow-amber-500/20">
                  <ShieldAlert className="w-4 h-4 text-amber-400" /> SUSPICIOUS INDICATOR
                </span>
              ) : result.threat_status === 'CLEAN / BENIGN' ? (
                <span className="px-3.5 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-500/20">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> CLEAN / BENIGN
                </span>
              ) : (
                <span className="px-3.5 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-full text-xs font-mono font-bold flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-slate-400" /> {result.threat_status || 'UNKNOWN'}
                </span>
              )}
            </div>

            <div className="mt-4 p-5 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-3.5 text-xs font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-400">Confidence Score:</span>
                  <span className="font-black text-cyan-400 text-sm">{(Number(result.confidence || 0) * 100).toFixed(0)}%</span>
                </div>
                <div className="flex-1 max-w-xs h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      result.threat_status === 'MALICIOUS'
                        ? 'bg-rose-500'
                        : result.threat_status === 'SUSPICIOUS'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(6, Number(result.confidence || 0) * 100))}%` }}
                  />
                </div>
              </div>

              {result.details && !result.details.toLowerCase().includes('ipsum lists') && (
                <div className="text-slate-200 leading-relaxed font-sans font-medium text-xs p-3 bg-slate-900/60 rounded-lg border border-slate-800/50">
                  <span className="font-bold text-cyan-400 font-mono">INTEL ASSESSMENT: </span>
                  {result.details}
                </div>
              )}

              {result.tags && result.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 uppercase font-mono font-bold mr-1">Classification Tags:</span>
                  {result.tags.map((tag: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-slate-800/70 border border-slate-700/50 rounded text-slate-300 font-mono text-[10px] uppercase"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recent Lookups Feed */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/40">
          <span className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">Session Threat Lookups Cache</span>
          <span className="text-[10px] font-mono text-slate-500">{recentLookups.length} Cached Queries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-mono font-bold border-b border-slate-800/80 text-[10px]">
              <tr>
                <th className="p-3.5">Indicator</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Threat Status</th>
                <th className="p-3.5">Reputation Intel Details</th>
                <th className="p-3.5 text-right">Intel Provider</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {recentLookups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">
                    No threat queries executed in this session yet. Try one of the calibrated sample IPs above.
                  </td>
                </tr>
              ) : (
                recentLookups.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-cyan-400">{item.indicator}</td>
                    <td className="p-3.5 text-slate-400 uppercase">{item.type}</td>
                    <td className="p-3.5">
                      {item.threat_status === 'MALICIOUS' ? (
                        <span className="text-rose-400 font-bold flex items-center gap-1.5 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/30 text-[10px] w-fit">
                          <ShieldAlert className="w-3 h-3 text-rose-400" /> MALICIOUS
                        </span>
                      ) : item.threat_status === 'SUSPICIOUS' ? (
                        <span className="text-amber-400 font-bold flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30 text-[10px] w-fit">
                          <ShieldAlert className="w-3 h-3 text-amber-400" /> SUSPICIOUS
                        </span>
                      ) : item.threat_status === 'CLEAN / BENIGN' ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 text-[10px] w-fit">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" /> CLEAN
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium flex items-center gap-1.5 text-[10px]">
                          <HelpCircle className="w-3 h-3 text-slate-500" /> {item.threat_status || 'UNKNOWN'}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-300 font-sans text-xs max-w-md truncate">
                      {item.details?.toLowerCase().includes('ipsum lists')
                        ? 'Flagged indicator identified across active threat feeds.'
                        : item.details}
                    </td>
                    <td className="p-3.5 font-mono text-[10px] text-slate-400 text-right">{item.provider || item.source || 'Threat Feed'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ThreatIntelligence;
