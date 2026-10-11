import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React runtime error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-sans">
          <div className="max-w-lg w-full bg-slate-900 border border-red-500/40 p-8 rounded-2xl shadow-2xl space-y-4 text-center">
            <div className="inline-flex p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-400">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Application Rendering Exception</h2>
            <p className="text-xs text-slate-400">
              A runtime component exception occurred while rendering the dashboard.
            </p>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-left overflow-auto max-h-36">
              <code className="text-[11px] text-red-300 font-mono">
                {this.state.error?.toString()}
              </code>
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" /> Reload Security Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
