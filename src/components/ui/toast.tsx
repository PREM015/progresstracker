// src/components/ui/toast.tsx
// Toast notification component (standalone, without external deps beyond cn)

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; // ms, 0 = persistent
  action?: { label: string; onClick: () => void };
  onClose?: () => void;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (options: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
}

// =============================================================================
// CONTEXT
// =============================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

// =============================================================================
// ICONS
// =============================================================================

const ICONS: Record<ToastVariant, string> = {
  default: '🔔',
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  default: 'bg-card border-border text-card-foreground',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-100',
  error: 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/50 dark:border-red-800 dark:text-red-100',
  warning: 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-100',
  info: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-100',
};

// =============================================================================
// TOAST ITEM
// =============================================================================

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const variant = t.variant ?? 'default';
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const duration = t.duration ?? 4000;
    if (duration > 0) {
      timerRef.current = setTimeout(() => onDismiss(t.id), duration);
    }
    return () => clearTimeout(timerRef.current);
  }, [t.id, t.duration, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-md',
        'animate-in slide-in-from-right-full fade-in duration-200',
        VARIANT_CLASSES[variant]
      )}
    >
      <span className="text-lg shrink-0">{ICONS[variant]}</span>
      <div className="flex-1 min-w-0">
        {t.title && <p className="text-sm font-semibold leading-tight">{t.title}</p>}
        {t.description && <p className="text-xs mt-0.5 opacity-80">{t.description}</p>}
        {t.action && (
          <button
            onClick={() => { t.action!.onClick(); onDismiss(t.id); }}
            className="mt-2 text-xs font-medium underline underline-offset-2 hover:opacity-70 transition-opacity"
          >
            {t.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => { t.onClose?.(); onDismiss(t.id); }}
        aria-label="Dismiss notification"
        className="shrink-0 text-sm opacity-60 hover:opacity-100 transition-opacity"
      >
        ✕
      </button>
    </div>
  );
}

// =============================================================================
// PROVIDER
// =============================================================================

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((options: Omit<Toast, 'id'>): string => {
    const id = `toast-${++idRef.current}`;
    setToasts((prev) => [...prev, { ...options, id }]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => {
      const t = prev.find((x) => x.id === id);
      t?.onClose?.();
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const dismissAll = useCallback(() => {
    setToasts((prev) => { prev.forEach((t) => t.onClose?.()); return []; });
  }, []);

  const success = useCallback((title: string, description?: string) => toast({ variant: 'success', title, description }), [toast]);
  const error = useCallback((title: string, description?: string) => toast({ variant: 'error', title, description }), [toast]);
  const warning = useCallback((title: string, description?: string) => toast({ variant: 'warning', title, description }), [toast]);
  const info = useCallback((title: string, description?: string) => toast({ variant: 'info', title, description }), [toast]);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss, dismissAll, success, error, warning, info }}>
      {children}
      {/* Toast viewport */}
      <div
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2 sm:max-w-sm w-full"
      >
        {toasts.map((t) => <ToastItem key={t.id} toast={t} onDismiss={dismiss} />)}
      </div>
    </ToastContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
