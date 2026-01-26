"use client";

import React, { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import clsx from "clsx";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error boundary caught:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className={clsx(
            "flex flex-col items-center justify-center gap-4 p-6",
            "rounded-lg border border-red-200 dark:border-red-800",
            "bg-red-50 dark:bg-red-900/20"
          )}>
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            <div className="text-center">
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                Something went wrong
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                {this.state.error?.message || "An unexpected error occurred"}
              </p>
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
