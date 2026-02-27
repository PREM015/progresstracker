'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class DashboardErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Dashboard Error Boundary caught error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-6 max-w-md text-center shadow-sm">
                        <div className="text-3xl mb-3">⚠️</div>
                        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
                            Something went wrong
                        </h3>
                        <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                            The dashboard encountered an unexpected error. Your data is safe.
                        </p>
                        {this.state.error && (
                            <p className="text-xs text-red-500 dark:text-red-500 mb-4 font-mono bg-red-100 dark:bg-red-900/30 p-2 rounded">
                                {this.state.error.message}
                            </p>
                        )}
                        <button
                            onClick={this.handleRetry}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
