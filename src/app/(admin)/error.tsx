"use client";

import React from "react";
import { AlertTriangle, Home } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-red-50 to-red-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Something went wrong!
        </h1>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          We encountered an error while loading the admin panel.
        </p>
        
        {error.message && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-300 font-mono">
              {error.message}
            </p>
          </div>
        )}
        
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Try again
          </button>
          
          <Link
            href="/dashboard"
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
