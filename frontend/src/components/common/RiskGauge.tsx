import React from 'react';

interface RiskGaugeProps {
  score: number;
  level?: string;
  size?: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score, level, size = 130 }) => {
  const normalizedScore = Math.min(100, Math.max(0, Math.round(score || 0)));
  
  let computedLevel = level;
  if (!computedLevel) {
    if (normalizedScore < 20) computedLevel = 'Normal';
    else if (normalizedScore < 60) computedLevel = 'Low';
    else if (normalizedScore < 80) computedLevel = 'Moderate';
    else if (normalizedScore < 90) computedLevel = 'High';
    else computedLevel = 'Critical';
  }

  // SVG gauge calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  let strokeColor = '#10B981';
  let textColor = 'text-emerald-400';
  let glowColor = 'rgba(16, 185, 129, 0.4)';

  if (normalizedScore >= 30) {
    strokeColor = '#F59E0B';
    textColor = 'text-amber-400';
    glowColor = 'rgba(245, 158, 11, 0.4)';
  }
  if (normalizedScore >= 60) {
    strokeColor = '#F97316';
    textColor = 'text-orange-400';
    glowColor = 'rgba(249, 115, 22, 0.4)';
  }
  if (normalizedScore >= 80) {
    strokeColor = '#EF4444';
    textColor = 'text-rose-400';
    glowColor = 'rgba(239, 68, 68, 0.4)';
  }

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      {/* Ambient Volumetric Glow Behind Gauge */}
      <div 
        className="absolute inset-2 rounded-full blur-xl opacity-30 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: strokeColor }}
      />

      <svg className="w-full h-full transform -rotate-90 relative z-10" viewBox="0 0 100 100">
        {/* Track Ring */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          className="stroke-slate-800/80"
          strokeWidth="6"
          fill="transparent"
        />
        {/* Progress Arc */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={strokeColor}
          strokeWidth="6"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10">
        <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${textColor}`}>
          {normalizedScore}
        </span>
        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest mt-0.5">
          {computedLevel}
        </span>
      </div>
    </div>
  );
};
