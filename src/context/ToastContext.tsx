'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  toast: (toast: Omit<Toast, 'id'>) => string; // returns id
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

function generateToastId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 10);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Record<string, number>>({});

  const removeToast = useCallback((id: string) => {
    const t = timeoutsRef.current[id];
    if (t) window.clearTimeout(t);
    delete timeoutsRef.current[id];

    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    Object.values(timeoutsRef.current).forEach((t) => window.clearTimeout(t));
    timeoutsRef.current = {};
    setToasts([]);
  }, []);

  const toast = useCallback(
    (toastData: Omit<Toast, 'id'>) => {
      const id = generateToastId();
      const newToast: Toast = { ...toastData, id };

      setToasts((prev) => [...prev, newToast]);

      const duration = toastData.duration ?? 5000;
      if (duration > 0) {
        timeoutsRef.current[id] = window.setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  useEffect(() => {
    return () => {
      // cleanup all timeouts on unmount
      Object.values(timeoutsRef.current).forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const contextValue = useMemo(
    () => ({ toasts, toast, removeToast, clearToasts }),
    [toasts, toast, removeToast, clearToasts]
  );

  return <ToastContext.Provider value={contextValue}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
