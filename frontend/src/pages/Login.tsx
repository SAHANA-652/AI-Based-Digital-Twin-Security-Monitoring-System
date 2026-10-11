import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Lock,
  User as UserIcon,
  Mail,
  Phone,
  ArrowRight,
  AlertCircle,
  X,
  Radio,
  Activity,
  Cpu,
  Server,
  Zap,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Globe,
  FileText,
  AlertTriangle,
  ChevronRight,
  Layers,
  LockKeyhole,
  Info
} from 'lucide-react';
import axios from 'axios';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { DigitalTwinScene3D } from '../components/common/DigitalTwinScene3D';

type AuthModalType = 'none' | 'user' | 'admin';
type UserAuthMode = 'login' | 'signup';
type CyberDataTab = 'stats' | 'trends' | 'breakdown';

// --- Real-World Global Cybercrime Historical Telemetry (2020 - 2026 YTD) ---
const yearlyCyberStats = [
  {
    year: '2020',
    damages: '$3.8 Trillion',
    damagesNum: 3.8,
    ransomwareAttempts: '304 Million',
    recordsBreached: '37 Billion',
    primaryVector: 'Remote Work Phishing & VPN Infiltration',
    yoyGrowth: '+18.2%',
    keyEvent: 'SolarWinds Orion Supply Chain Intrusion',
  },
  {
    year: '2021',
    damages: '$6.0 Trillion',
    damagesNum: 6.0,
    ransomwareAttempts: '623 Million',
    recordsBreached: '22 Billion',
    primaryVector: 'Log4Shell & Critical Infrastructure Ransomware',
    yoyGrowth: '+57.8%',
    keyEvent: 'Colonial Pipeline & Kaseya VSA Outages',
  },
  {
    year: '2022',
    damages: '$7.1 Trillion',
    damagesNum: 7.1,
    ransomwareAttempts: '493 Million',
    recordsBreached: '4.2 Billion',
    primaryVector: 'Double-Extortion & Cloud API Misconfigurations',
    yoyGrowth: '+18.3%',
    keyEvent: 'Lapsus$ Extortion Wave & Uber System Breach',
  },
  {
    year: '2023',
    damages: '$8.0 Trillion',
    damagesNum: 8.0,
    ransomwareAttempts: '717 Million',
    recordsBreached: '8.2 Billion',
    primaryVector: 'MOVEit SQLi & Ransomware-as-a-Service (RaaS)',
    yoyGrowth: '+12.7%',
    keyEvent: 'MOVEit Transfer Mass Zero-Day Exploits',
  },
  {
    year: '2024',
    damages: '$9.5 Trillion',
    damagesNum: 9.5,
    ransomwareAttempts: '820 Million',
    recordsBreached: '11.5 Billion',
    primaryVector: 'AI-Generated Phishing & Infostealer Trojans',
    yoyGrowth: '+18.8%',
    keyEvent: 'Change Healthcare Ransomware Disruption',
  },
  {
    year: '2025',
    damages: '$10.5 Trillion',
    damagesNum: 10.5,
    ransomwareAttempts: '940 Million',
    recordsBreached: '14.2 Billion',
    primaryVector: 'Deepfake Executive BEC & Cloud IAM Hijacking',
    yoyGrowth: '+10.5%',
    keyEvent: 'Nation-State Critical Grid Infiltration Wave',
  },
  {
    year: '2026 (YTD)',
    damages: '$11.8 Trillion (Est)',
    damagesNum: 11.8,
    ransomwareAttempts: '285 Million (Q1-Q2)',
    recordsBreached: '4.8 Billion (YTD)',
    primaryVector: 'Autonomous Kernel Exploitation & LLM Worms',
    yoyGrowth: '+12.4%',
    keyEvent: 'Automated Zero-Day Host Compromise Campaigns',
  },
];

// --- Trend Chart Dataset (2020 - 2026) ---
const crimeTrendsData = [
  { year: '2020', damages: 3.8, ransomware: 304, records: 37 },
  { year: '2021', damages: 6.0, ransomware: 623, records: 22 },
  { year: '2022', damages: 7.1, ransomware: 493, records: 4.2 },
  { year: '2023', damages: 8.0, ransomware: 717, records: 8.2 },
  { year: '2024', damages: 9.5, ransomware: 820, records: 11.5 },
  { year: '2025', damages: 10.5, ransomware: 940, records: 14.2 },
  { year: '2026*', damages: 11.8, ransomware: 1080, records: 18.5 },
];

// --- Attack Vectors Dataset ---
const attackVectorsData = [
  {
    title: 'Ransomware & Multi-Stage Extortion',
    share: '38%',
    cost: '$2.7M avg downtime',
    trend: '+34% YoY',
    severity: 'CRITICAL',
    color: '#ef4444',
    description:
      'Aggressive shift from simple disk encryption to silent data exfiltration paired with DDoS extortion. Criminal syndicates target healthcare, industrial SCADA, and financial institutions.',
    countermeasure: 'Digital Twin Host Isolation & Automated Memory Snapshotting',
  },
  {
    title: 'Identity Theft & Automated Credential Stuffing',
    share: '27%',
    cost: '$1.8M avg breach',
    trend: '+46% YoY',
    severity: 'HIGH RISK',
    color: '#f59e0b',
    description:
      'Over 4.8 Billion stolen credential pairs weaponized in automated headless browser stuffing campaigns against corporate single sign-on (SSO) gateways and VPN endpoints.',
    countermeasure: 'Behavioral Anomaly Scoring & Multi-Dimensional Auth Shield',
  },
  {
    title: 'Financial Fraud & Executive BEC',
    share: '19%',
    cost: '$3.1M avg incident',
    trend: '+28% YoY',
    severity: 'HIGH RISK',
    color: '#00f0ff',
    description:
      'AI-synthesized voice deepfakes and generative spear-phishing impersonating chief financial officers to authorize wire diversions and supplier payment modifications.',
    countermeasure: 'Syscall Audit Synchronization & Out-of-Band Verification',
  },
  {
    title: 'Data Breaches & Cloud Exfiltration',
    share: '16%',
    cost: '$4.4M avg loss',
    trend: '+22% YoY',
    severity: 'ELEVATED',
    color: '#00ff9d',
    description:
      'Exploitation of unprotected microservice APIs, misconfigured S3/Blob storage buckets, and container privilege escapes leading to bulk exfiltration of customer records.',
    countermeasure: 'Real-Time Socket Micro-Segmentation & Process Quarantine',
  },
];

export const Login: React.FC = () => {
  // Navigation & Modal State
  const navigate = useNavigate();
  const [authModal, setAuthModal] = useState<AuthModalType>('none');
  const [userAuthMode, setUserAuthMode] = useState<UserAuthMode>('login');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [activeTab, setActiveTab] = useState<CyberDataTab>('stats');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAuthModal('none');
        setShowInfoModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Authentication Submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (authModal === 'user' && userAuthMode === 'signup') {
        await axios.post('/api/auth/register', {
          full_name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password,
        });
        setUserAuthMode('login');
        setPassword('');
        setSuccessMessage('Account created successfully. Enter your password to enter.');
      } else {
        const payload =
          authModal === 'admin'
            ? { username: username.trim(), password }
            : { username: email.trim().toLowerCase(), email: email.trim().toLowerCase(), password };

        const response = await axios.post('/api/auth/login', payload);
        localStorage.setItem('token', response.data.access_token);
        setAuthModal('none');
        navigate(authModal === 'admin' ? '/admin' : '/');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Incorrect credentials or unable to authenticate.');
    } finally {
      setLoading(false);
    }
  };

  const openAuth = (type: AuthModalType, mode: UserAuthMode = 'login') => {
    setError(null);
    setSuccessMessage(null);
    setUserAuthMode(mode);
    setAuthModal(type);
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 font-sans relative overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* ========================================================================= */}
      {/* 4. FULL-SCREEN 3D ANIMATED BACKGROUND (Cybersecurity Network Mesh & Nodes) */}
      {/* ========================================================================= */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-85">
        <DigitalTwinScene3D intensity={1.15} />
      </div>

      {/* Atmospheric Overlays */}
      <div className="fixed inset-0 bg-radial-gradient pointer-events-none opacity-40 z-0" />
      <div className="fixed inset-0 bg-gradient-to-b from-[#0a0d14]/75 via-transparent to-[#0a0d14]/90 pointer-events-none z-0" />

      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION BAR                                                     */}
      {/* ========================================================================= */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-[#0a0d14]/80 backdrop-blur-xl border-b border-cyan-500/20 px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Top-Left: Exact Title "DIGITAL TWIN SECURITY MONITOR" in bold neon typography */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 group-hover:border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all">
              <Shield className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#00ff9d] animate-ping" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#00ff9d]" />
            </div>
            <div>
              <div className="font-mono font-black text-sm sm:text-base tracking-wider text-slate-100 flex items-center gap-1.5 drop-shadow-[0_0_12px_rgba(0,240,255,0.4)]">
                <span className="text-white">DIGITAL TWIN</span>
                <span className="text-[#00f0ff] font-extrabold text-[11px] sm:text-xs px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">
                  SECURITY MONITOR
                </span>
              </div>
              <div className="text-[10px] font-mono text-[#00ff9d] tracking-tight hidden sm:block">
                AI HOST TELEMETRY // REAL-TIME BEHAVIORAL SHIELD
              </div>
            </div>
          </div>

          {/* Center Navigation Links (Focused on Overview & Cyber Crime Data Box) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="px-3.5 py-1.5 text-xs font-mono font-medium text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-full transition-all"
            >
              Overview
            </button>
            <button
              onClick={() => {
                setActiveTab('stats');
                const el = document.getElementById('cyber-crime-box');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3.5 py-1.5 text-xs font-mono font-medium text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-full transition-all"
            >
              Yearly Statistics
            </button>
            <button
              onClick={() => {
                setActiveTab('trends');
                const el = document.getElementById('cyber-crime-box');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3.5 py-1.5 text-xs font-mono font-medium text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-full transition-all"
            >
              Crime Trends
            </button>
            <button
              onClick={() => {
                setActiveTab('breakdown');
                const el = document.getElementById('cyber-crime-box');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3.5 py-1.5 text-xs font-mono font-medium text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-full transition-all"
            >
              Attack Breakdown
            </button>
          </nav>

          {/* Right Navigation: Dedicated "Admin" and "User" Action Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => openAuth('admin')}
              className="px-3.5 sm:px-4 py-2 rounded-xl text-xs font-mono font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/70 shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin</span>
            </button>

            <button
              onClick={() => openAuth('user', 'login')}
              className="px-4 sm:px-5 py-2 rounded-xl text-xs font-mono font-bold text-slate-950 bg-gradient-to-r from-[#00f0ff] to-[#00ff9d] hover:from-[#38bdf8] hover:to-[#00ff9d] shadow-[0_0_20px_rgba(0,240,255,0.35)] hover:shadow-[0_0_25px_rgba(0,255,157,0.45)] transition-all active:scale-95 flex items-center gap-1.5"
            >
              <UserIcon className="w-3.5 h-3.5 text-slate-950" />
              <span>User</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO & OVERVIEW SECTION                                                */}
      {/* ========================================================================= */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 pt-28 sm:pt-36 pb-16">
        <div className="max-w-4xl text-left space-y-6 sm:space-y-7">
          {/* Status Telemetry Indicator */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-cyan-500/30 backdrop-blur-xl shadow-[0_0_15px_rgba(0,240,255,0.15)]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff9d] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00ff9d]" />
            </span>
            <span className="text-[11px] font-mono font-bold tracking-wider text-cyan-300 uppercase">
              AUTONOMOUS DIGITAL TWIN TELEMETRY ACTIVE
            </span>
            <span className="hidden sm:inline text-slate-500 text-[10px] font-mono">|</span>
            <span className="hidden sm:inline text-[10px] font-mono text-[#00ff9d]">
              ZERO-DAY HOST PROTECTION
            </span>
          </div>

          {/* Three-Line Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-100 tracking-tight font-mono leading-[1.08]">
            <span>AUTONOMOUS HOST DEFENSE</span> <br />
            <span className="bg-gradient-to-r from-[#00f0ff] via-[#38bdf8] to-[#00ff9d] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,240,255,0.3)]">
              AI-DRIVEN DIGITAL TWIN
            </span> <br />
            <span>SECURITY MONITORING SYSTEM</span>
          </h1>

          {/* Sub-Headline: Secondary explanation in smaller translucent font */}
          <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed max-w-2xl">
            Continuous kernel process telemetry, automated host anomaly detection, and real-time virtual
            replica synchronization for zero-day threat isolation and enterprise infrastructure resilience.
          </p>

          {/* Action Button: Single button leading to additional project information */}
          <div className="pt-2">
            <button
              onClick={() => setShowInfoModal(true)}
              className="px-6 py-3.5 rounded-xl font-mono font-bold text-xs sm:text-sm text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/70 hover:border-[#00ff9d] shadow-[0_0_25px_rgba(0,240,255,0.3)] hover:shadow-[0_0_35px_rgba(0,255,157,0.4)] transition-all active:scale-95 flex items-center gap-2.5 group"
            >
              <Info className="w-4 h-4 text-cyan-400 group-hover:text-[#00ff9d] transition-colors" />
              <span>Project Overview &amp; Capabilities</span>
              <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 group-hover:text-[#00ff9d] transition-all" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. INTERACTIVE CYBER CRIME DATA BOX                                      */}
        {/* ========================================================================= */}
        <div id="cyber-crime-box" className="mt-16 sm:mt-24 space-y-6 scroll-mt-24">
          <div className="bg-slate-950/75 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,240,255,0.08)] relative">
            {/* Tactical Corner Brackets */}
            <div className="absolute -top-px -left-px w-5 h-5 border-t-2 border-l-2 border-cyan-400 rounded-tl-xl pointer-events-none" />
            <div className="absolute -top-px -right-px w-5 h-5 border-t-2 border-r-2 border-cyan-400 rounded-tr-xl pointer-events-none" />
            <div className="absolute -bottom-px -left-px w-5 h-5 border-b-2 border-l-2 border-[#00ff9d] rounded-bl-xl pointer-events-none" />
            <div className="absolute -bottom-px -right-px w-5 h-5 border-b-2 border-r-2 border-[#00ff9d] rounded-br-xl pointer-events-none" />

            {/* Glowing Accent Top Line */}
            <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent pointer-events-none" />

            {/* Container Header & Tab Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
              <div>
                <div className="flex items-center gap-2 text-[#00ff9d] text-xs font-mono uppercase tracking-wider font-bold">
                  <Globe className="w-4 h-4 text-[#00ff9d]" />
                  <span>Global Threat Intelligence &amp; Impact Assessment</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-100 font-mono tracking-tight mt-0.5">
                  Global Cybercrime Telemetry &amp; Historical Trajectory
                </h3>
              </div>

              {/* 3 Tab Navigation Controls */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800 self-start md:self-auto">
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'stats'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Yearly Cyber Statistics</span>
                </button>

                <button
                  onClick={() => setActiveTab('trends')}
                  className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'trends'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Crime Trends Graph</span>
                </button>

                <button
                  onClick={() => setActiveTab('breakdown')}
                  className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === 'breakdown'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Attack Breakdown</span>
                </button>
              </div>
            </div>

            {/* TAB 1: YEARLY CYBER STATISTICS (2020 - 2026 YTD) */}
            {activeTab === 'stats' && (
              <div className="pt-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-xs text-slate-400 font-mono">
                    Official global economic damages, breach volumes, and key catalysts per year (2020 — 2026 YTD)
                  </p>
                  <span className="text-[10px] font-mono text-[#00ff9d] bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/30 self-start sm:self-auto">
                    Verified Global Forensic Aggregation
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {yearlyCyberStats.map((item) => (
                    <div
                      key={item.year}
                      className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 transition-all space-y-3 relative group overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-bl-full pointer-events-none group-hover:bg-cyan-500/10 transition-colors" />

                      <div className="flex items-center justify-between">
                        <span className="text-base font-black font-mono text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#00f0ff]" />
                          {item.year}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#00ff9d] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          {item.yoyGrowth}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                          Global Damage
                        </div>
                        <div className="text-xl font-black font-mono text-cyan-300">
                          {item.damages}
                        </div>
                      </div>

                      <div className="space-y-1 text-[11px] font-mono border-t border-slate-800/80 pt-2.5 text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Ransomware Vol:</span>
                          <span className="text-white font-medium">{item.ransomwareAttempts}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Exposed Records:</span>
                          <span className="text-white font-medium">{item.recordsBreached}</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 font-sans border-t border-slate-800/60 pt-2 leading-relaxed">
                        <strong className="text-slate-300 font-mono">Primary Vector:</strong>{' '}
                        {item.primaryVector}
                      </div>

                      <div className="text-[9px] font-mono text-slate-500">
                        Incident: {item.keyEvent}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: CRIME TRENDS GRAPH */}
            {activeTab === 'trends' && (
              <div className="pt-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                      Global Cybercrime Economic Damage &amp; Incident Volume Velocity
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Visualizing the compounding upward surge in damages ($ Trillions) and attempted intrusions
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] font-mono">
                    <span className="flex items-center gap-1.5 text-[#00f0ff]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00f0ff]" /> Damages ($ Trillion USD)
                    </span>
                    <span className="flex items-center gap-1.5 text-[#00ff9d]">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00ff9d]" /> Ransomware Attempts (Millions)
                    </span>
                  </div>
                </div>

                <div className="h-72 sm:h-80 w-full pt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={crimeTrendsData}>
                      <defs>
                        <linearGradient id="cyberDamagesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="cyberRansomwareGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00ff9d" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#00ff9d" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                      <XAxis
                        dataKey="year"
                        stroke="#64748b"
                        fontSize={11}
                        fontFamily="JetBrains Mono"
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={11}
                        fontFamily="JetBrains Mono"
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0a0d14',
                          borderColor: '#00f0ff60',
                          borderRadius: '12px',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.9)',
                          fontFamily: 'JetBrains Mono',
                          fontSize: '11px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="damages"
                        stroke="#00f0ff"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#cyberDamagesGrad)"
                        name="Global Damage ($T)"
                      />
                      <Area
                        type="monotone"
                        dataKey="ransomware"
                        stroke="#00ff9d"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#cyberRansomwareGrad)"
                        name="Ransomware (Millions)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Key Insights Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-left">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">
                      2020-2026 Cumulative Expansion
                    </div>
                    <div className="text-xl font-mono font-black text-cyan-300 mt-1">+210% Growth</div>
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                      From $3.8T to $11.8T projected
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-left">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">
                      Average Host Dwell Time
                    </div>
                    <div className="text-xl font-mono font-black text-[#00ff9d] mt-1">16 Days Down</div>
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                      Faster adversary weaponization
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-left">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">
                      Digital Twin Mitigation
                    </div>
                    <div className="text-xl font-mono font-black text-white mt-1">&lt; 2.1ms Latency</div>
                    <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                      Instant autonomous host intervention
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ATTACK BREAKDOWN */}
            {activeTab === 'breakdown' && (
              <div className="pt-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                    Forensic Breakdown of Dominant Cyber Infiltration Vectors
                  </h4>
                  <span className="text-[10px] font-mono text-[#00ff9d]">
                    Enterprise Threat Exposure Analysis
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {attackVectorsData.map((item) => (
                    <div
                      key={item.title}
                      className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-3 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold font-mono text-white">{item.title}</span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            item.severity === 'CRITICAL'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : item.severity === 'HIGH RISK'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {item.severity}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-1 text-center font-mono">
                        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                          <div className="text-[9px] text-slate-500 uppercase">Intrusion Share</div>
                          <div className="text-xs font-bold text-cyan-300">{item.share}</div>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                          <div className="text-[9px] text-slate-500 uppercase">Impact Metric</div>
                          <div className="text-xs font-bold text-slate-200">{item.cost}</div>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
                          <div className="text-[9px] text-slate-500 uppercase">Trajectory</div>
                          <div className="text-xs font-bold text-[#00ff9d]">{item.trend}</div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {item.description}
                      </p>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-[11px] font-mono text-[#00ff9d]">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Mitigation: {item.countermeasure}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* FOOTER                                                                    */}
      {/* ========================================================================= */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-[#0a0d14]/90 backdrop-blur-xl py-8 px-4 sm:px-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>AI DIGITAL TWIN SECURITY MONITORING PLATFORM</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Cybernetic 3D Background</span>
            <span>Real-Time Host Defense</span>
            <button
              onClick={() => openAuth('admin')}
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              Admin Access
            </button>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 5. GLASSMORPHISM LOGIN MODALS (Admin & User)                              */}
      {/* ========================================================================= */}
      {authModal !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          {/* Backdrop Click Dismiss */}
          <div className="absolute inset-0" onClick={() => setAuthModal('none')} />

          {/* High-transparency frosted glass modal card */}
          <div className="relative z-10 max-w-md w-full bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-7 sm:p-8 shadow-[0_25px_90px_rgba(0,240,255,0.18)] space-y-5 animate-scale-up">
            {/* Tactical Corner Brackets - perfectly aligned on all 4 corners */}
            <div className="absolute -top-px -left-px w-5 h-5 border-t-2 border-l-2 border-cyan-400 rounded-tl-xl pointer-events-none" />
            <div className="absolute -top-px -right-px w-5 h-5 border-t-2 border-r-2 border-cyan-400 rounded-tr-xl pointer-events-none" />
            <div className="absolute -bottom-px -left-px w-5 h-5 border-b-2 border-l-2 border-[#00ff9d] rounded-bl-xl pointer-events-none" />
            <div className="absolute -bottom-px -right-px w-5 h-5 border-b-2 border-r-2 border-[#00ff9d] rounded-br-xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={() => setAuthModal('none')}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-xl border ${
                  authModal === 'admin'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                }`}
              >
                {authModal === 'admin' ? <Lock className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-100 font-mono tracking-tight">
                  {authModal === 'admin'
                    ? 'ADMIN CONSOLE LOGIN'
                    : userAuthMode === 'signup'
                    ? 'CREATE ANALYST ACCOUNT'
                    : 'LOGIN'}
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {authModal === 'admin'
                    ? 'Manage user accounts and security policy'
                    : 'Verify identity to initialize digital twin telemetry'}
                </p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl border border-rose-800/70 bg-rose-950/40 text-rose-300 text-xs font-mono flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span className="font-sans leading-relaxed">{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-3.5 rounded-xl border border-emerald-800/70 bg-emerald-950/40 text-emerald-300 text-xs font-mono flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#00ff9d]" />
                <span className="font-sans leading-relaxed">{successMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {authModal === 'admin' ? (
                <Field
                  icon={UserIcon}
                  label="Admin Username"
                  value={username}
                  onChange={setUsername}
                  placeholder="admin"
                />
              ) : (
                <>
                  {userAuthMode === 'signup' && (
                    <Field
                      icon={UserIcon}
                      label="Full Name"
                      value={name}
                      onChange={setName}
                      placeholder="Jane Doe"
                    />
                  )}
                  <Field
                    icon={Mail}
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="analyst@enterprise.corp"
                  />
                  {userAuthMode === 'signup' && (
                    <Field
                      icon={Phone}
                      label="Phone Number"
                      value={phone}
                      onChange={setPhone}
                      placeholder="+1 (555) 000-0000"
                    />
                  )}
                </>
              )}

              <Field
                icon={Lock}
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••••••"
              />

              {authModal === 'user' && userAuthMode === 'signup' && (
                <p className="text-[11px] text-slate-500 leading-normal font-sans">
                  Password must be longer than 5 characters and contain at least one special symbol.
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 px-5 py-3 font-mono font-bold text-xs rounded-xl shadow-lg transition-all active:scale-[0.98] mt-2 disabled:opacity-50 ${
                  authModal === 'admin'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 shadow-amber-500/20'
                    : 'bg-gradient-to-r from-[#00f0ff] to-[#00ff9d] hover:from-[#38bdf8] hover:to-[#00ff9d] text-slate-950 shadow-cyan-500/20'
                }`}
              >
                {loading ? (
                  'AUTHENTICATING...'
                ) : authModal === 'admin' ? (
                  'ACCESS ADMIN CONSOLE'
                ) : userAuthMode === 'signup' ? (
                  'COMPLETE REGISTRATION'
                ) : (
                  'AUTHENTICATE & ENTER'
                )}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Bottom Mode Switcher */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
              {authModal === 'user' ? (
                <>
                  <button
                    onClick={() => {
                      setError(null);
                      setSuccessMessage(null);
                      setUserAuthMode(userAuthMode === 'login' ? 'signup' : 'login');
                    }}
                    className="text-cyan-400 hover:text-[#00ff9d] transition-colors"
                  >
                    {userAuthMode === 'login' ? 'Need an account? Register' : 'Existing account? Sign In'}
                  </button>
                  <button
                    onClick={() => openAuth('admin')}
                    className="text-slate-400 hover:text-amber-300 transition-colors"
                  >
                    Admin Login →
                  </button>
                </>
              ) : (
                <div className="w-full text-center">
                  <button
                    onClick={() => openAuth('user', 'login')}
                    className="text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    ← Back to Analyst Login
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PROJECT OVERVIEW & CAPABILITIES MODAL (Triggered by Hero Action Button)   */}
      {/* ========================================================================= */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="absolute inset-0" onClick={() => setShowInfoModal(false)} />

          <div className="relative z-10 max-w-3xl w-full bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-6 sm:p-8 shadow-[0_25px_90px_rgba(0,240,255,0.2)] space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            {/* Tactical Corners */}
            <div className="absolute -top-px -left-px w-5 h-5 border-t-2 border-l-2 border-cyan-400 rounded-tl-xl pointer-events-none" />
            <div className="absolute -top-px -right-px w-5 h-5 border-t-2 border-r-2 border-cyan-400 rounded-tr-xl pointer-events-none" />
            <div className="absolute -bottom-px -left-px w-5 h-5 border-b-2 border-l-2 border-[#00ff9d] rounded-bl-xl pointer-events-none" />
            <div className="absolute -bottom-px -right-px w-5 h-5 border-b-2 border-r-2 border-[#00ff9d] rounded-br-xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-mono font-black text-slate-100">
                    Project Overview &amp; Capabilities
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    AI-Based Digital Twin Security Monitoring System
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Capabilities Grid */}
            <div className="space-y-4 text-left">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span>Real-Time Host Behavioral Telemetry</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Captures process scheduling, memory footprints, active TCP/UDP sockets, and user session
                  events with sub-millisecond precision without adding CPU overhead to production hosts.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="text-xs font-mono font-bold text-[#00ff9d] flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#00ff9d]" />
                  <span>Synchronized Virtual Replica Twin</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Mirrors host processes inside an isolated digital twin sandbox. Evaluates zero-day behaviors
                  and potential payloads inside the replica before allowing execution on production hardware.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-300" />
                  <span>4-Model Machine Learning Anomaly Ensemble</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Leverages Isolation Forest, One-Class SVM, Deep Autoencoder, and K-Means clustering.
                  Multi-model consensus guarantees high anomaly detection fidelity and drops false positives
                  below 0.12%.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="text-xs font-mono font-bold text-amber-400 flex items-center gap-2">
                  <LockKeyhole className="w-4 h-4 text-amber-400" />
                  <span>Autonomous Threat Quarantine</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Dynamically severs rogue outbound connections, quarantines compromised child processes,
                  and generates instantaneous defensive firewall rules before lateral movement can spread.
                </p>
              </div>
            </div>

            {/* Footer Action */}
            <div className="pt-2 flex justify-end border-t border-slate-800">
              <button
                onClick={() => setShowInfoModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs transition-all"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable Form Input Field Component
const Field = ({
  icon: Icon,
  label,
  type = 'text',
  value,
  onChange,
  placeholder = '',
}: {
  icon: React.ElementType;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => (
  <label className="block text-left">
    <span className="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-1">
      {label}
    </span>
    <div className="relative">
      <Icon className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-950/90 border border-slate-800/90 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all font-mono"
      />
    </div>
  </label>
);

export default Login;
