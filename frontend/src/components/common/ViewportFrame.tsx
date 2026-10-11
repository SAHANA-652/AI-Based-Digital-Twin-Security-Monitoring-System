import React from 'react';

interface ViewportFrameProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  badgeType?: 'live' | 'sim' | 'warning' | 'info';
  children: React.ReactNode;
  className?: string;
  showScanline?: boolean;
  actionContent?: React.ReactNode;
}

export const ViewportFrame: React.FC<ViewportFrameProps> = ({
  title,
  subtitle,
  badge,
  badgeType = 'live',
  children,
  className = '',
  showScanline = false,
  actionContent,
}) => {
  const badgeColors = {
    live: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    sim: 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse',
    warning: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    info: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  };

  return (
    <div className={`relative bg-slate-900/70 backdrop-blur-xl border border-slate-800/90 rounded-2xl overflow-hidden shadow-2xl ${className}`}>
      {/* Tactical Corner Brackets */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-500/60 pointer-events-none z-20" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-500/60 pointer-events-none z-20" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-500/60 pointer-events-none z-20" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-500/60 pointer-events-none z-20" />

      {/* Top Tactical Bar (if title provided) */}
      {(title || badge || actionContent) && (
        <div className="px-5 py-3.5 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400/80 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-indigo-400/50" />
            </div>
            <div>
              {title && (
                <h3 className="text-xs font-bold tracking-wider uppercase text-slate-200 flex items-center gap-2">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-[10px] text-slate-400 font-mono tracking-tight">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {badge && (
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${badgeColors[badgeType]}`}>
                {badge}
              </span>
            )}
            {actionContent}
          </div>
        </div>
      )}

      {/* Scanline overlay (optional) */}
      {showScanline && (
        <div className="absolute inset-0 pointer-events-none scanline-overlay opacity-30 z-10" />
      )}

      {/* Frame Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
