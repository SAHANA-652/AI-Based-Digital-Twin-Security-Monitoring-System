import React from 'react';

interface AlertBannerProps {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  isSimulationMode?: boolean;
}

import { AlertCircle, AlertTriangle, CheckCircle2, Info, Zap } from 'lucide-react';

export const AlertBanner: React.FC<AlertBannerProps> = ({ type, message, isSimulationMode }) => {
  if (isSimulationMode) {
    return (
      <div className="bg-amber-50/90 border border-amber-300 p-4 rounded-xl mb-4 shadow-sm flex items-start gap-3 text-xs">
        <div className="p-1 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5">
          <Zap className="w-4 h-4 text-amber-600 animate-bounce" />
        </div>
        <div>
          <span className="font-bold text-amber-900 uppercase tracking-wide block mb-0.5">
            Simulation Mode Active
          </span>
          <p className="text-amber-800 leading-relaxed">{message}</p>
        </div>
      </div>
    );
  }

  const config = {
    info: {
      bg: 'bg-indigo-50 border-indigo-200 text-indigo-900',
      icon: <Info className="w-4 h-4 text-indigo-600" />,
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
    },
    error: {
      bg: 'bg-rose-50 border-rose-200 text-rose-900',
      icon: <AlertCircle className="w-4 h-4 text-rose-600" />,
    },
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    },
  };

  const current = config[type] || config.info;

  return (
    <div className={`border p-4 rounded-xl mb-4 shadow-subtle flex items-start gap-3 text-xs ${current.bg}`}>
      <span className="shrink-0 mt-0.5">{current.icon}</span>
      <p className="leading-relaxed font-medium">{message}</p>
    </div>
  );
};
