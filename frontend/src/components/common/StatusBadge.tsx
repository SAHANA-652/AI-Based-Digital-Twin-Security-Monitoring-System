import React from 'react';
import { Tooltip } from './Tooltip';

interface StatusBadgeProps {
  status: 'normal' | 'elevated' | 'high' | 'critical' | 'Normal' | 'Elevated' | 'High' | 'Critical' | string;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const norm = (status || 'normal').toLowerCase();
  
  const config: Record<string, { bg: string; dot: string; glow: string }> = {
    normal: { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400', glow: 'shadow-glow-emerald' },
    low: { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400', glow: 'shadow-glow-emerald' },
    moderate: { bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30', dot: 'bg-amber-400', glow: 'shadow-glow-amber' },
    elevated: { bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30', dot: 'bg-amber-400', glow: 'shadow-glow-amber' },
    high: { bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30', dot: 'bg-orange-400', glow: 'shadow-glow-amber' },
    critical: { bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30', dot: 'bg-rose-400', glow: 'shadow-glow-rose' },
    resolved: { bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30', dot: 'bg-cyan-400', glow: 'shadow-glow-cyan' },
    acknowledged: { bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30', dot: 'bg-purple-400', glow: 'shadow-glow-indigo' },
    'false positive': { bg: 'bg-slate-800/80 text-slate-400 border-slate-700', dot: 'bg-slate-500', glow: '' },
    new: { bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30', dot: 'bg-indigo-400', glow: 'shadow-glow-indigo' },
  };

  const current = config[norm] || config.normal;

  return (
    <Tooltip content={`Current status is ${norm}`}>
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border ${current.bg} transition-all`}>
        <span className={`w-1.5 h-1.5 rounded-full ${current.dot} animate-pulse`} />
        {label || norm.toUpperCase()}
      </span>
    </Tooltip>
  );
};
