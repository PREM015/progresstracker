'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home, Copy, Check } from 'lucide-react';
import { logger } from '@/lib/logger';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
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
    logger.error(
      'Global error caught (app/global-error.tsx)',
      { digest: error?.digest },
      error
    );
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
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        {/* Background */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(239,68,68,0.12),transparent_55%)]" />
        </div>

        <main className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <div className="rounded-2xl border bg-card shadow-xl overflow-hidden">
              {/* Header */}
              <div className="flex items-start gap-4 p-6 border-b">
                <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>

                <div className="flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold leading-tight">
                    Something went wrong
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Don’t worry — your data is safe. You can try reloading the
                    page or go back home.
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
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

                {/* Actions */}
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

                {/* Dev-only stack */}
                {isDev && errorDetails.stack && (
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="text-sm font-semibold mb-2">
                      Stack trace (dev only)
                    </p>
                    <pre className="text-xs overflow-auto whitespace-pre-wrap font-mono text-muted-foreground max-h-64">
                      {errorDetails.stack}
                    </pre>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t text-xs text-muted-foreground flex items-center justify-between">
                <span>ProgressTracker • Global Error Handler</span>
                <span className="font-mono">
                  {new Date().toISOString().slice(0, 19).replace('T', ' ')}
                </span>
              </div>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
