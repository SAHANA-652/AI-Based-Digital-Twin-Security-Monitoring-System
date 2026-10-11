import React from 'react';
import { Tooltip } from './Tooltip';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  tooltip: string;
  trend?: 'up' | 'down' | 'stable';
  status?: 'normal' | 'elevated' | 'high' | 'critical' | 'Normal' | 'Elevated' | 'High' | 'Critical' | string;
  /** Accept either a pre-rendered JSX element or a component class/function */
  icon?: React.ReactNode;
  subValue?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  tooltip,
  trend,
  status = 'normal',
  icon,
  subValue
}) => {
  const normStatus = (status || 'normal').toLowerCase();
  
  const statusColors: Record<string, { text: string; glow: string; border: string }> = {
    normal: { text: 'text-slate-100', glow: '', border: 'hover:border-cyan-500/30' },
    low: { text: 'text-emerald-400', glow: '', border: 'hover:border-emerald-500/30' },
    elevated: { text: 'text-amber-400', glow: 'shadow-glow-amber', border: 'border-amber-500/40' },
    high: { text: 'text-orange-400', glow: 'shadow-glow-amber', border: 'border-orange-500/40' },
    critical: { text: 'text-rose-400', glow: 'shadow-glow-rose', border: 'border-rose-500/40' },
  };

  const currentTheme = statusColors[normStatus] || statusColors.normal;

  return (
    <div className={`relative bg-slate-900/60 backdrop-blur-xl p-4 rounded-2xl border border-slate-800/80 ${currentTheme.border} ${currentTheme.glow} shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between group overflow-hidden`}>
      {/* Top subtle inner border highlight */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

      <div className="flex justify-between items-start mb-2 relative z-10">
        <Tooltip content={tooltip}>
          <h3 className="text-slate-400 text-xs font-semibold cursor-help border-b border-dashed border-slate-700/80 group-hover:text-cyan-300 transition-colors truncate max-w-[110px] tracking-wide">
            {title}
          </h3>
        </Tooltip>
        {icon ? (
          <div className="p-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 group-hover:text-cyan-300 group-hover:border-cyan-500/40 group-hover:bg-cyan-500/10 transition-colors shrink-0 shadow-2xs">
            {icon}
          </div>
        ) : trend ? (
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${
            trend === 'up' 
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
              : trend === 'down' 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '▬'}
          </span>
        ) : null}
      </div>

      <div className="mt-1 relative z-10">
        <div className="flex items-baseline gap-1">
          <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${currentTheme.text}`}>
            {value}
          </span>
          {unit && <span className="text-slate-400 text-xs font-semibold font-mono">{unit}</span>}
        </div>
        {subValue && (
          <span className="block text-[11px] text-slate-400 mt-1 font-mono truncate">{subValue}</span>
        )}
      </div>
    </div>
  );
};
