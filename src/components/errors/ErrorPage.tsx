'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface ErrorPageProps {
  error?: Error & { digest?: string };
  reset?: () => void;
  className?: string;
  statusCode?: number;
  title?: string;
  message?: string;
}

export default function ErrorPage({
  error,
  reset,
  className = '',
  statusCode = 500,
  title = 'Something went wrong',
  message = 'We apologize for the inconvenience. Please try again later.'
}: ErrorPageProps) {
  return (
    <div className={`min-h-[60vh] flex items-center justify-center p-4 ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-6"
      >
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 bg-red-500/20 rounded-full animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {statusCode === 404 ? 'Page Not Found' : title}
          </h1>
          <p className="text-zinc-400 text-lg">
            {statusCode === 404
              ? "The page you're looking for doesn't exist or has been moved."
              : error?.message || message}
          </p>
          {error?.digest && (
            <p className="text-xs text-zinc-600 font-mono mt-4">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          {reset && (
            <Button
              onClick={reset}
              variant="outline"
              className="gap-2 border-zinc-700 hover:bg-zinc-800"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          )}

          <Button
            onClick={() => window.location.href = '/'}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Home className="w-4 h-4" />
            Return Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
