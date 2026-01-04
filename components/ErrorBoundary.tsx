'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logError } from '@/lib/monitoring';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * 
 * Catches React errors and logs them to the database.
 * Shows a friendly error message to users.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to monitoring system
    logError(error, {
      component: errorInfo.componentStack || 'Unknown',
      route: window.location.pathname,
      stack: error.stack,
    }).catch((logError) => {
      console.error('[ErrorBoundary] Failed to log error:', logError);
    });

    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-screen w-full bg-[#0a0a0a] text-white items-center justify-center">
          <div className="max-w-md mx-auto p-6 bg-[#1a1a1a] border border-[#333] rounded-lg">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
              <p className="text-gray-400 mb-6">
                We encountered an unexpected error. Refreshing may help.
              </p>
              <button
                onClick={this.handleReload}
                className="px-6 py-3 bg-[#ff6b35] hover:bg-[#ff7b45] text-white rounded-lg font-medium transition-colors"
              >
                Refresh Page
              </button>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500">
                    Error Details (Dev Only)
                  </summary>
                  <pre className="mt-2 p-4 bg-[#0a0a0a] border border-[#333] rounded text-xs overflow-auto">
                    {this.state.error.toString()}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

