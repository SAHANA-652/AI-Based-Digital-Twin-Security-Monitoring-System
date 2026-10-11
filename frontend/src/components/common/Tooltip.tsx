import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children || <HelpCircle className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-400 transition-colors cursor-help" />}
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3.5 py-2 bg-slate-950/95 text-slate-200 text-xs rounded-xl shadow-2xl whitespace-normal max-w-xs z-50 border border-slate-800 border-t-cyan-500/40 pointer-events-none text-left leading-relaxed font-normal backdrop-blur-xl">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-950"></div>
        </div>
      )}
    </div>
  );
};
