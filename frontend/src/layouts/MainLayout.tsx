import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Cpu, Brain, Activity, Network, 
  Shield, Search, Bell, Clock, Zap, BookOpen, 
  BarChart3, FileText, Settings, LogOut, Info, Square,
  Menu, X, Radio
} from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import axios from 'axios';

const navSections = [
  {
    title: 'CORE COMMAND',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/intro', label: 'Introduction Guide', icon: Info },
      { path: '/twin', label: 'Digital Twin', icon: Cpu },
    ]
  },
  {
    title: 'TELEMETRY & SENSORS',
    items: [
      { path: '/process', label: 'Process Monitor', icon: Activity },
      { path: '/network', label: 'Network Monitor', icon: Network },
      { path: '/auth', label: 'Auth Events', icon: Shield },
    ]
  },
  {
    title: 'AI & ANOMALIES',
    items: [
      { path: '/ml', label: 'ML Analysis', icon: Brain },
      { path: '/alerts', label: 'Alerts', icon: Bell },
      { path: '/timeline', label: 'Security Timeline', icon: Clock },
    ]
  },
  {
    title: 'THREAT & SIMULATION',
    items: [
      { path: '/simulator', label: 'Attack Simulator', icon: Zap },
      { path: '/threat-intel', label: 'Threat Intelligence', icon: Search },
      { path: '/knowledge', label: 'Threat Knowledge', icon: BookOpen },
    ]
  },
  {
    title: 'OPERATIONS & AUDIT',
    items: [
      { path: '/history', label: 'Historical Analysis', icon: BarChart3 },
      { path: '/reports', label: 'Reports', icon: FileText },
      { path: '/settings', label: 'Settings', icon: Settings },
    ]
  },
];

export const MainLayout: React.FC = () => {
  const wsData = useWebSocket();
  const navigate = useNavigate();
  const [stoppingSim, setStoppingSim] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isSim = wsData?.telemetry?.summary?.is_simulation || 
                wsData?.telemetry?.is_simulation || 
                wsData?.mode === 'SIMULATION' || 
                wsData?.monitoring_state?.mode === 'SIMULATION' ||
                wsData?.monitoring_state?.simulation_active;

  const simScenarioName = wsData?.simulation_scenario || 
                          wsData?.monitoring_state?.simulation_scenario || 
                          wsData?.simulation?.scenario_name ||
                          'Synthetic Attack Vector';

  const riskScore = wsData?.risk?.score || 0;
  const riskLevel = wsData?.risk?.level || 'Normal';

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
    } catch {
      // Ignore network errors during session termination
    }
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleStopGlobalSimulation = async () => {
    try {
      setStoppingSim(true);
      await axios.post('/api/simulation/stop');
    } catch (e) {
      console.error('Error stopping global simulation:', e);
    } finally {
      setStoppingSim(false);
    }
  };

  const formatScenarioTitle = (name: string) => {
    if (!name) return 'Attack Simulation';
    return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <div className="flex h-screen bg-[#0a0d14] text-slate-200 overflow-hidden font-sans relative">
      {/* Background Ambience & Technical Grid */}
      <div className="absolute inset-0 bg-command-grid opacity-25 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#00ff9d]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          onClick={closeMobile}
          className="fixed inset-0 bg-black/70 backdrop-blur-md z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside className={`
        fixed lg:static top-0 bottom-0 left-0 z-50
        w-64 bg-slate-950/90 backdrop-blur-2xl border-r border-slate-800/80 flex flex-col shrink-0
        transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-glow-cyan text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-white/10 opacity-30" />
              <Shield className="w-5 h-5 relative z-10" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-slate-100 text-sm tracking-wider leading-none uppercase">Digital Twin</h1>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">SOC</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-1 tracking-tight">AI Command Center</p>
            </div>
          </div>

          <button 
            onClick={closeMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Navigation items categorized */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
          {navSections.map((section, sIdx) => (
            <div key={sIdx}>
              <div className="px-2 mb-1.5 text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                {section.title}
              </div>
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.path === '/'}
                      onClick={closeMobile}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-xs font-semibold ${
                          isActive 
                            ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/40 shadow-glow-cyan' 
                            : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                        }`
                      }
                    >
                      <item.icon className="w-4 h-4 shrink-0 opacity-80" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        
        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 text-slate-400 hover:text-rose-400 text-xs font-semibold w-full px-3 py-2 rounded-xl hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout Analyst</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Persistent Global Simulation Banner */}
        {isSim && (
          <div className="bg-gradient-to-r from-amber-950/90 via-orange-950/90 to-amber-950/90 border-b border-amber-500/50 px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-glow-amber z-30 text-xs shrink-0 text-amber-200 animate-pulse">
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Zap className="w-4 h-4 animate-bounce" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold uppercase tracking-wider text-xs font-mono text-amber-400">
                  ATTACK SIMULATION ACTIVE:
                </span>
                <span className="font-bold font-mono bg-amber-500/20 px-2.5 py-0.5 rounded border border-amber-500/30 text-amber-100">
                  {formatScenarioTitle(simScenarioName)}
                </span>
                <span className="hidden md:inline text-amber-300/70 text-[11px] font-mono">
                  (In-memory synthetic telemetry overlay)
                </span>
              </div>
            </div>

            <button
              onClick={handleStopGlobalSimulation}
              disabled={stoppingSim}
              className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold shadow-lg transition transform hover:scale-105 active:scale-95 text-xs shrink-0 font-mono"
            >
              <Square className="w-3.5 h-3.5 fill-current text-white" />
              {stoppingSim ? 'Stopping...' : 'Stop Simulation'}
            </button>
          </div>
        )}

        {/* Top Command Bar */}
        <header className="h-16 bg-slate-950/70 backdrop-blur-xl border-b border-slate-800/80 flex items-center justify-between px-4 sm:px-6 shrink-0 z-20">
          <div className="flex items-center gap-3 text-xs">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-bold text-[11px] uppercase tracking-wider">Live Telemetry Engine</span>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-slate-400 border-l border-slate-800 pl-3 font-mono">
              <span className="text-slate-500 text-[11px]">RISK:</span>
              <span className={`font-bold px-2 py-0.5 rounded-full text-[11px] border ${
                riskScore > 60 
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                  : riskScore > 35 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}>
                {riskScore.toFixed(0)}/100 ({riskLevel})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isSim ? (
              <span className="px-2.5 py-1 text-[10px] font-mono font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/40 shadow-glow-amber animate-pulse">
                SIMULATION MODE
              </span>
            ) : (
              <span className="hidden xs:inline-flex px-2.5 py-1 text-[10px] font-mono font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                REAL-TIME MONITORING
              </span>
            )}

            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800 text-xs">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 border border-cyan-500/40 flex items-center justify-center text-white font-black text-xs shadow-glow-cyan font-mono">
                OP
              </div>
              <div className="hidden md:block text-left">
                <span className="text-slate-200 font-bold block leading-none font-mono text-xs">Admin Analyst</span>
                <span className="text-[10px] text-slate-500 font-mono tracking-tight">Security Operator</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Main Content Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
