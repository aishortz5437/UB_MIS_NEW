import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
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
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 p-4 font-sans text-slate-800">
          <div className="flex max-w-md flex-col items-center justify-center space-y-5 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle size={32} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Something went wrong
              </h2>
              <p className="text-sm text-slate-500">
                We couldn't load this section. Please try again.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 pt-4 sm:flex-row">
              <button 
                onClick={this.handleReset}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <RefreshCcw size={16} />
                Try Again
              </button>
              <button 
                onClick={this.handleGoHome}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Home size={16} />
                Go To Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
