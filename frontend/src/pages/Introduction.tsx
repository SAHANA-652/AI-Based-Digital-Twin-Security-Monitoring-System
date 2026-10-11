import React from 'react';
import {
  Shield, Cpu, Brain, Activity, CheckCircle2,
  AlertTriangle, Layers, BookOpen, Lock, Terminal, ArrowRight,
  ShieldCheck, Sparkles, HeartPulse, Check, Radio
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

export const Introduction: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto py-2">
      {/* Hero Command Banner */}
      <div className="relative overflow-hidden bg-slate-900/80 backdrop-blur-2xl border border-slate-800/90 p-8 sm:p-10 rounded-3xl shadow-2xl space-y-6 text-slate-100">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-glow-cyan/20 shrink-0">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold mb-2">
              <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" /> Behavioral Endpoint Defense Architecture
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-100 font-mono leading-tight">
              AI DIGITAL TWIN SECURITY MONITORING
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium max-w-2xl leading-relaxed">
              Continuous Host Behavioral Modeling, 4-Model ML Ensemble & Explainable Incident Forensics
            </p>
          </div>
        </div>

        <p className="relative z-10 text-xs sm:text-sm text-slate-300 leading-relaxed pt-1 max-w-3xl font-sans">
          This system constructs and maintains a real-time behavioral <strong className="text-cyan-400 font-mono font-bold">Digital Twin</strong> of the host computer. Rather than relying solely on static byte signatures or brittle hardcoded thresholds, the Digital Twin dynamically models the personalized baseline of your specific machine across diverse operating workloads (idle, development, gaming, compiled tasks) and evaluates multi-signal deviations using an ensemble of four unsupervised machine learning architectures.
        </p>

        <div className="relative z-10 flex flex-wrap gap-3 pt-2">
          <NavLink
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-[0.98] text-slate-950 rounded-xl text-xs font-mono font-bold shadow-lg shadow-cyan-500/20 transition-all"
          >
            <span>LAUNCH CORE DASHBOARD</span>
            <ArrowRight className="w-4 h-4" />
          </NavLink>
          <NavLink
            to="/knowledge"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 rounded-xl text-xs font-mono font-semibold border border-slate-700 transition-all"
          >
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>THREAT ENCYCLOPEDIA</span>
          </NavLink>
        </div>
      </div>

      {/* Core Architectural Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 rounded-2xl shadow-xl hover:border-cyan-500/40 transition-all space-y-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-100 font-mono tracking-tight">1. Behavioral Digital Twin</h3>
          <p className="text-xs text-slate-400 leading-relaxed font-sans font-medium">
            Constructs a personalized expectation model using moving averages, statistical deviations, and gradual baseline adaptation protected against adversarial baseline poisoning.
          </p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 rounded-2xl shadow-xl hover:border-indigo-500/40 transition-all space-y-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Brain className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-100 font-mono tracking-tight">2. 4-Model ML Ensemble</h3>
          <p className="text-xs text-slate-400 leading-relaxed font-sans font-medium">
            Fuses normalized scores from Isolation Forest (30%), One-Class SVM (25%), Deep Autoencoder (30%), and K-Means Context Clustering (15%) into a unified anomaly index.
          </p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 rounded-2xl shadow-xl hover:border-amber-500/40 transition-all space-y-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-100 font-mono tracking-tight">3. Transparent Explainability</h3>
          <p className="text-xs text-slate-400 leading-relaxed font-sans font-medium">
            Every risk calculation decomposes into exact contributor points (+18 Network, +14 Process, +10 ML). Telemetric anomalies are never blindly labeled malware.
          </p>
        </div>
      </div>

      {/* Philosophy & Safety Guarantees */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 sm:p-8 rounded-2xl shadow-xl space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 tracking-tight font-mono">
              ENGINEERING PRINCIPLES & SAFETY BOUNDARIES
            </h2>
            <p className="text-xs text-slate-400">Core architectural commitments ensuring zero host disruption</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold">✓</span>
              <span className="font-bold text-slate-200">Monitoring & Decision Support Only</span>
            </div>
            <p className="text-slate-400 leading-relaxed pl-7 font-sans font-medium">
              The system never automatically terminates processes, deletes files, modifies OS configuration, or executes destructive remediation actions.
            </p>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold">✓</span>
              <span className="font-bold text-slate-200">Honest Telemetry & Zero Fabrication</span>
            </div>
            <p className="text-slate-400 leading-relaxed pl-7 font-sans font-medium">
              Unsupported sensors or platform APIs display "Unavailable on this system" rather than fabricating fake telemetry, temperatures, or accuracy metrics.
            </p>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold">✓</span>
              <span className="font-bold text-slate-200">Non-Destructive Attack Simulation</span>
            </div>
            <p className="text-slate-400 leading-relaxed pl-7 font-sans font-medium">
              Synthetic simulation scenarios inject synthetic metrics in software memory only, allowing safe demonstration without endangering the host computer.
            </p>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold">✓</span>
              <span className="font-bold text-slate-200">Anomaly != Malware</span>
            </div>
            <p className="text-slate-400 leading-relaxed pl-7 font-sans font-medium">
              Elevated compute (e.g. gaming, software compilation) is categorized contextually without false-positive malware alarms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Introduction;
