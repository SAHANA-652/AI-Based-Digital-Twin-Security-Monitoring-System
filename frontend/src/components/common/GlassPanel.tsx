import React from 'react';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  glow?: 'cyan' | 'indigo' | 'amber' | 'rose' | 'emerald' | 'none';
  onClick?: () => void;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className = '',
  glow = 'none',
  onClick,
}) => {
  const glowStyles = {
    none: '',
    cyan: 'shadow-glow-cyan border-cyan-500/30',
    indigo: 'shadow-glow-indigo border-indigo-500/30',
    amber: 'shadow-glow-amber border-amber-500/30',
    rose: 'shadow-glow-rose border-rose-500/30',
    emerald: 'shadow-glow-emerald border-emerald-500/30',
  };

  return (
    <div
      onClick={onClick}
      className={`relative bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl transition-all duration-200 ${glowStyles[glow]} ${className}`}
    >
      {/* Top subtle highlight border */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
      {children}
    </div>
  );
};
