'use client';

import React from 'react';

interface ErrorBoundaryFallbackProps {
    error: Error;
    resetError: () => void;
    className?: string;
}

export const ErrorBoundaryFallback: React.FC<ErrorBoundaryFallbackProps> = ({
    error,
    resetError,
    className = '',
}) => {
    return (
        <div className={`min-h-screen flex items-center justify-center bg-gray-50 px-4 ${className}`}>
            <div className="max-w-md w-full bg-white border-2 border-red-200 rounded-2xl p-8 text-center">
                {/* Error Icon */}
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl">⚠️</span>
                </div>

                {/* Error Message */}
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    Oops! Something went wrong
                </h2>
                <p className="text-gray-600 mb-6">
                    We encountered an unexpected error. Please try again or contact support if the problem persists.
                </p>

                {/* Error Details (Development Only) */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                        <p className="text-xs font-mono text-red-700 break-all">
                            {error.message}
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={resetError}
                        className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                    >
                        Go Home
                    </button>
                </div>

                {/* Support Link */}
                <a
                    href="/support"
                    className="inline-block mt-4 text-sm text-indigo-600 hover:text-indigo-700"
                >
                    Contact Support →
                </a>
            </div>
        </div>
    );
};

export default ErrorBoundaryFallback;
