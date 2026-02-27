// ============================================================================
// FILE: src/components/errors/ErrorBoundary.tsx
// PURPOSE: Error Boundary component to catch React tree errors
// ============================================================================

'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // You could also log this to an error reporting service here
  }

  resetError = () => {
    this.state = { hasError: false, error: null };
    this.forceUpdate();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Something went wrong</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-md">
            We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="mb-4 max-w-lg overflow-auto rounded bg-muted p-4 text-xs text-left">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()} variant="default">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload Page
            </Button>
            <Button onClick={this.resetError} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
