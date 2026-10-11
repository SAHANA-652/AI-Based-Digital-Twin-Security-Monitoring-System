import React, { useState } from 'react';
import { 
  Cpu, Activity, HardDrive, Wifi, Server, Shield, 
  AlertTriangle, CheckCircle2, Zap, Radio, ChevronRight, Eye
} from 'lucide-react';

interface DigitalTwinTopologyProps {
  cpuPercent?: number;
  ramPercent?: number;
  diskReadKB?: number | string;
  diskWriteKB?: number | string;
  netUpKB?: number | string;
  netDownKB?: number | string;
  procsCount?: number;
  socketsCount?: number;
  isSim?: boolean;
  overallHealth?: string;
  deviations?: Record<string, any>;
  onSelectNode?: (nodeId: string) => void;
  selectedNodeId?: string | null;
}

export const DigitalTwinTopology: React.FC<DigitalTwinTopologyProps> = ({
  cpuPercent = 0,
  ramPercent = 0,
  diskReadKB = '0.0',
  diskWriteKB = '0.0',
  netUpKB = '0.0',
  netDownKB = '0.0',
  procsCount = 0,
  socketsCount = 0,
  isSim = false,
  overallHealth = 'Normal',
  deviations = {},
  onSelectNode,
  selectedNodeId,
}) => {
  const [internalSelected, setInternalSelected] = useState<string>('compute');
  const activeNode = selectedNodeId || internalSelected;

  const handleSelect = (id: string) => {
    setInternalSelected(id);
    if (onSelectNode) onSelectNode(id);
  };

  const nodes = [
    {
      id: 'compute',
      label: 'Compute Core',
      sublabel: 'CPU Subsystem',
      icon: Cpu,
      value: `${Number(cpuPercent).toFixed(1)}%`,
      metricLabel: 'Load',
      hasDeviation: !!deviations.cpu_percent,
      deviationDetails: deviations.cpu_percent,
      color: 'cyan',
    },
    {
      id: 'memory',
      label: 'Memory Bank',
      sublabel: 'RAM Allocation',
      icon: Activity,
      value: `${Number(ramPercent).toFixed(1)}%`,
      metricLabel: 'Utilized',
      hasDeviation: !!deviations.ram_percent,
      deviationDetails: deviations.ram_percent,
      color: 'indigo',
    },
    {
      id: 'storage',
      label: 'Storage Array',
      sublabel: 'Disk I/O Controller',
      icon: HardDrive,
      value: `${diskWriteKB} KB/s`,
      metricLabel: 'Write Rate',
      hasDeviation: !!deviations.disk_write_rate || !!deviations.disk_read_rate,
      deviationDetails: deviations.disk_write_rate || deviations.disk_read_rate,
      color: 'emerald',
    },
    {
      id: 'network',
      label: 'Network Gateway',
      sublabel: 'Sockets & Bandwidth',
      icon: Wifi,
      value: `${socketsCount}`,
      metricLabel: 'Active Sockets',
      hasDeviation: !!deviations.net_connections_count || !!deviations.net_upload_rate,
      deviationDetails: deviations.net_connections_count || deviations.net_upload_rate,
      color: 'sky',
    },
    {
      id: 'processes',
      label: 'Process Scheduler',
      sublabel: 'Active Task Density',
      icon: Server,
      value: `${procsCount}`,
      metricLabel: 'Live Procs',
      hasDeviation: !!deviations.process_count,
      deviationDetails: deviations.process_count,
      color: 'violet',
    },
    {
      id: 'security',
      label: 'Security Kernel',
      sublabel: 'Auth & Threat Shield',
      icon: Shield,
      value: isSim ? 'SIMULATED' : 'PROTECTED',
      metricLabel: 'Engine State',
      hasDeviation: isSim || overallHealth === 'Critical' || overallHealth === 'Degraded',
      deviationDetails: null,
      color: isSim ? 'amber' : 'emerald',
    },
  ];

  const selectedNodeData = nodes.find(n => n.id === activeNode) || nodes[0];

  return (
    <div className="relative bg-slate-950/80 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-5 sm:p-7 overflow-hidden shadow-2xl">
      {/* Background Volumetric Lighting Field */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700 ${
          isSim ? 'bg-amber-500' : overallHealth === 'Critical' ? 'bg-rose-600' : 'bg-cyan-500'
        }`}
      />

      {/* Viewport Header */}
      <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800/80 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 shadow-glow-cyan">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                Cyber-Physical Digital Twin Topology
              </h2>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                isSim 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/40 animate-pulse'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40'
              }`}>
                {isSim ? '● Simulation Mode' : '● Live Synchronized'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Interactive host architecture • Select any subsystem node to inspect baseline variance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>CYCLE: 1.0s STREAM</span>
        </div>
      </div>

      {/* Main Interactive Topology Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
        {/* Left Subsystem Nodes */}
        <div className="lg:col-span-4 space-y-3">
          {nodes.slice(0, 3).map((node) => {
            const isSelected = activeNode === node.id;
            return (
              <div
                key={node.id}
                onClick={() => handleSelect(node.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'bg-slate-900/90 border-cyan-500/60 shadow-glow-cyan translate-x-1.5'
                    : 'bg-slate-900/40 hover:bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border ${
                      isSelected 
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
                        : 'bg-slate-800/80 text-slate-400 border-slate-700/60'
                    }`}>
                      <node.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{node.label}</h4>
                      <p className="text-[11px] text-slate-400">{node.sublabel}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-slate-100">{node.value}</span>
                    <span className="block text-[10px] text-slate-500 font-medium">{node.metricLabel}</span>
                  </div>
                </div>

                {node.hasDeviation && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-amber-400 flex items-center gap-1 font-semibold">
                      <AlertTriangle className="w-3 h-3" /> Baseline Deviation
                    </span>
                    <span className="font-mono text-amber-300">
                      {node.deviationDetails?.z_score ? `z: ${node.deviationDetails.z_score.toFixed(1)}σ` : 'Anomaly'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Center Digital Twin Engine Hologram */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-4">
          <div className="relative flex items-center justify-center w-52 h-52 select-none">
            {/* Concentric Pulsing SVG Circuit Rings */}
            <svg className="w-full h-full transform -rotate-90 animate-spin-slow" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r="90"
                className="stroke-slate-800"
                strokeWidth="1.5"
                fill="none"
              />
              <circle
                cx="100"
                cy="100"
                r="75"
                className="stroke-cyan-500/40 animate-data-flow"
                strokeWidth="2"
                strokeDasharray="8 8"
                fill="none"
              />
              <circle
                cx="100"
                cy="100"
                r="60"
                className="stroke-indigo-500/30"
                strokeWidth="1"
                fill="none"
              />
            </svg>

            {/* Core Center Emblem */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-600/30 via-indigo-600/30 to-slate-900 border border-cyan-500/50 flex flex-col items-center justify-center shadow-glow-cyan backdrop-blur-md">
                <Zap className="w-7 h-7 text-cyan-400 animate-pulse" />
                <span className="text-[9px] font-mono font-black tracking-widest text-cyan-200 mt-0.5">TWIN v2.4</span>
              </div>
              <span className="text-[11px] font-bold text-slate-300 mt-2 tracking-wide uppercase">Host Core Engine</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full mt-1 border ${
                isSim 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/40' 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40'
              }`}>
                {isSim ? 'OVERLAID' : 'SYNCHRONIZED'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Subsystem Nodes */}
        <div className="lg:col-span-4 space-y-3">
          {nodes.slice(3, 6).map((node) => {
            const isSelected = activeNode === node.id;
            return (
              <div
                key={node.id}
                onClick={() => handleSelect(node.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'bg-slate-900/90 border-cyan-500/60 shadow-glow-cyan -translate-x-1.5'
                    : 'bg-slate-900/40 hover:bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl border ${
                      isSelected 
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
                        : 'bg-slate-800/80 text-slate-400 border-slate-700/60'
                    }`}>
                      <node.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{node.label}</h4>
                      <p className="text-[11px] text-slate-400">{node.sublabel}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-slate-100">{node.value}</span>
                    <span className="block text-[10px] text-slate-500 font-medium">{node.metricLabel}</span>
                  </div>
                </div>

                {node.hasDeviation && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-amber-400 flex items-center gap-1 font-semibold">
                      <AlertTriangle className="w-3 h-3" /> Baseline Deviation
                    </span>
                    <span className="font-mono text-amber-300">
                      {node.deviationDetails?.z_score ? `z: ${node.deviationDetails.z_score.toFixed(1)}σ` : 'Anomaly'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Subsystem Contextual Panel */}
      <div className="mt-6 pt-5 border-t border-slate-800/80 bg-slate-900/50 p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <selectedNodeData.icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Inspecting Subsystem:</span>
              <h3 className="text-sm font-bold text-slate-100">{selectedNodeData.label}</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Current Telemetry: <span className="font-mono font-bold text-slate-200">{selectedNodeData.value}</span> ({selectedNodeData.metricLabel})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
            <span className="text-slate-500">STATE:</span>{' '}
            <span className={selectedNodeData.hasDeviation ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
              {selectedNodeData.hasDeviation ? 'DEVIATING FROM BASELINE' : 'WITHIN STATISTICAL LIMITS'}
            </span>
          </div>

          {selectedNodeData.deviationDetails && (
            <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
              <span className="text-slate-500">EXPECTED:</span>{' '}
              <span className="text-cyan-400 font-bold">
                {selectedNodeData.deviationDetails.mean?.toFixed(1) || '0.0'} ± {selectedNodeData.deviationDetails.std?.toFixed(1) || '1.0'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
