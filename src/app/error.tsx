'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home, Copy, Check } from 'lucide-react';
import { logger } from '@/lib/logger';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [copied, setCopied] = useState(false);

  const isDev = process.env.NODE_ENV === 'development';

  const errorDetails = useMemo(() => {
    const message = error?.message || 'An unexpected error occurred';
    const digest = error?.digest;
    const stack = error?.stack;
    return { message, digest, stack };
  }, [error]);

  useEffect(() => {
    logger.error('Route error caught (app/error.tsx)', { digest: error?.digest }, error);
  }, [error]);

  const handleReset = async () => {
    try {
      setIsResetting(true);
      reset();
    } finally {
      setTimeout(() => setIsResetting(false), 800);
    }
  };

  const handleCopy = async () => {
    try {
      const payload = {
        message: errorDetails.message,
        digest: errorDetails.digest,
        stack: errorDetails.stack,
      };
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="rounded-2xl border bg-card shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b flex items-start gap-4">
            <div className="h-11 w-11 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold">This page crashed</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Something failed while loading this route. You can retry safely.
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-sm font-medium mb-1">Error message</p>
              <p className="text-sm text-muted-foreground wrap-break-word">
                {errorDetails.message}
              </p>

              {isDev && errorDetails.digest && (
                <div className="mt-3 text-xs text-muted-foreground">
                  <span className="font-semibold">Digest:</span>{' '}
                  <span className="font-mono">{errorDetails.digest}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleReset}
                disabled={isResetting}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`}
                />
                {isResetting ? 'Retrying...' : 'Try again'}
              </button>

              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 border hover:bg-accent transition"
              >
                <Home className="h-4 w-4" />
                Go to Home
              </Link>

              {isDev && (
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 border hover:bg-accent transition"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy error
                    </>
                  )}
                </button>
              )}
            </div>

            {isDev && errorDetails.stack && (
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-sm font-semibold mb-2">Stack trace (dev only)</p>
                <pre className="text-xs overflow-auto whitespace-pre-wrap font-mono text-muted-foreground max-h-64">
                  {errorDetails.stack}
                </pre>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t text-xs text-muted-foreground flex items-center justify-between">
            <span>ProgressTracker • Route Error</span>
            <span className="font-mono">
              {new Date().toISOString().slice(0, 19).replace('T', ' ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
