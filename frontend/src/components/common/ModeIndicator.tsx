import React from 'react';

interface ModeIndicatorProps {
  mode: 'LIVE' | 'SIMULATION' | 'DEGRADED';
}

export const ModeIndicator: React.FC<ModeIndicatorProps> = ({ mode }) => {
  const styles = {
    LIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-glow-emerald',
    SIMULATION: 'bg-amber-500/10 text-amber-400 border-amber-500/50 shadow-glow-amber animate-pulse',
    DEGRADED: 'bg-rose-500/10 text-rose-400 border-rose-500/40 shadow-glow-rose',
  };

  const dots = {
    LIVE: 'bg-emerald-400',
    SIMULATION: 'bg-amber-400',
    DEGRADED: 'bg-rose-400',
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border font-mono font-bold text-[11px] tracking-wider uppercase ${styles[mode]}`}>
      <span className="relative flex h-2 w-2">
        {mode === 'LIVE' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        )}
        {mode === 'SIMULATION' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dots[mode]}`}></span>
      </span>
      <span>{mode} MODE</span>
    </div>
  );
};
