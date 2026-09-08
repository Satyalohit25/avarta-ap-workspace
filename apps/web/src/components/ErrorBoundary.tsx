import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by Avarta ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleNavigateHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/overview";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-8 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-5">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-xs font-semibold tracking-wider uppercase text-indigo-600 dark:text-indigo-400 mb-1">
              Avarta AP Workspace
            </div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              An unexpected application error occurred. You can reload the workspace or return to the overview screen.
            </p>

            {this.state.error && (
              <div className="mb-6 p-3 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-left overflow-x-auto text-xs font-mono text-slate-700 dark:text-slate-300 max-h-32 border border-slate-200 dark:border-slate-700">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Screen
              </button>
              <button
                type="button"
                onClick={this.handleNavigateHome}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <Home className="w-4 h-4" />
                Overview
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
