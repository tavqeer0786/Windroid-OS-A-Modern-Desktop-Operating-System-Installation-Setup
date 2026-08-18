import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, XCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class InstallerErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[InstallerErrorBoundary] Uncaught installer error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[480px] bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-8 font-sans select-none">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-semibold text-white mb-2">
              Installer Encountered an Error
            </h2>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              An unhandled exception occurred in the Windroid OS Setup interface. The system has safely isolated the failure.
            </p>

            {this.state.error && (
              <div className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 mb-6 text-left overflow-x-auto">
                <div className="text-[11px] font-mono text-rose-300 break-all">
                  {this.state.error.message || 'Unknown render exception'}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={this.handleRetry}
                className="flex-1 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-medium rounded-lg shadow transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Installer
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
