import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface Props {
  children: ReactNode;
  onClose?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class InstallerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[InstallerErrorBoundary] Caught uncaught error in installer UI:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="relative w-full h-full min-h-full bg-[#12182B] text-slate-100 flex items-center justify-center p-6 select-none font-sans antialiased">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Windroid Setup Error</h2>
                <p className="text-xs text-slate-400 mt-0.5">An unexpected interface error occurred.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs font-mono text-red-300 break-words leading-relaxed max-h-32 overflow-y-auto">
              {this.state.error?.message || 'Unknown runtime error'}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Your system hardware and drive contents remain safe. You can restart the setup application or return to your live desktop session.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              {this.props.onClose && (
                <button
                  onClick={this.props.onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                >
                  Return to Desktop
                </button>
              )}
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-[#0067C0] hover:bg-blue-600 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restart Setup</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
