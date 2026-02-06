'use client';

import React from 'react';

interface ServerErrorProps {
  error?: Error;
  reset?: () => void;
  className?: string;
}

export const ServerError: React.FC<ServerErrorProps> = ({
  error,
  reset,
  className = '',
}) => {
  return (
    <div className={`min-h-screen bg-gray-50 flex items-center justify-center p-8 ${className}`}>
      <div className="bg-white border rounded-2xl p-12 max-w-md w-full text-center">
        <div className="text-8xl mb-6">🔧</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">500</h1>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Server Error</h2>
        <p className="text-gray-600 mb-8">
          Sorry, something went wrong on our end. We're working to fix it.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left text-sm text-red-700">
            {error.message}
          </div>
        )}

        <div className="flex gap-3">
          {reset && (
            <button
              onClick={reset}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Try Again
            </button>
          )}
          <a
            href="/"
            className="flex-1 px-6 py-3 border rounded-lg hover:bg-gray-50 inline-block"
          >
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default ServerError;
