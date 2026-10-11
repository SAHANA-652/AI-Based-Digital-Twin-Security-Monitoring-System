import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { DigitalTwin } from './pages/DigitalTwin';
import { MLAnalysis } from './pages/MLAnalysis';
import { ProcessMonitor } from './pages/ProcessMonitor';
import { NetworkMonitor } from './pages/NetworkMonitor';
import { AuthEvents } from './pages/AuthEvents';
import { ThreatIntelligence } from './pages/ThreatIntelligence';
import { Alerts } from './pages/Alerts';
import { SecurityTimeline } from './pages/SecurityTimeline';
import { AttackSimulator } from './pages/AttackSimulator';
import { ThreatKnowledge } from './pages/ThreatKnowledge';
import { HistoricalAnalysis } from './pages/HistoricalAnalysis';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Introduction } from './pages/Introduction';
import { AdminDashboard } from './pages/AdminDashboard';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  localStorage.getItem('token') ? <>{children}</> : <Navigate to="/login" replace />
);

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminDashboard />} />
          
          {/* Main Application Layout with Nested Routes */}
          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="intro" element={<Introduction />} />
            <Route path="twin" element={<DigitalTwin />} />
            <Route path="ml" element={<MLAnalysis />} />
            <Route path="process" element={<ProcessMonitor />} />
            <Route path="network" element={<NetworkMonitor />} />
            <Route path="auth" element={<AuthEvents />} />
            <Route path="threat-intel" element={<ThreatIntelligence />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="timeline" element={<SecurityTimeline />} />
            <Route path="simulator" element={<AttackSimulator />} />
            <Route path="knowledge" element={<ThreatKnowledge />} />
            <Route path="history" element={<HistoricalAnalysis />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Fallback to Dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
