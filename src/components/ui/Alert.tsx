/**
 * Component: Alert
 * Location: components/ui/Alert.tsx
 * 
 * Description: Premium, animated alert component with glassmorphism and variants
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AlertProps {
  variant?: 'default' | 'info' | 'success' | 'warning' | 'error';
  title?: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
  children?: React.ReactNode;
}

const variantConfig = {
  default: {
    container: 'bg-[var(--card-bg)] border-[var(--card-border)] text-[var(--foreground)]',
    icon: <Info className="w-5 h-5 text-(--text-muted)" />,
    shimmer: 'from-gray-500/0 via-gray-500/10 to-gray-500/0'
  },
  info: {
    container: 'bg-blue-50/50 border-blue-200/50 text-blue-900 dark:bg-blue-950/30 dark:border-blue-800/50 dark:text-blue-100 backdrop-blur-md',
    icon: <Info className="w-5 h-5 text-blue-500" />,
    shimmer: 'from-blue-400/0 via-blue-400/20 to-blue-400/0'
  },
  success: {
    container: 'bg-emerald-50/50 border-emerald-200/50 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800/50 dark:text-emerald-100 backdrop-blur-md',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    shimmer: 'from-emerald-400/0 via-emerald-400/20 to-emerald-400/0'
  },
  warning: {
    container: 'bg-amber-50/50 border-amber-200/50 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800/50 dark:text-amber-100 backdrop-blur-md',
    icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    shimmer: 'from-amber-400/0 via-amber-400/20 to-amber-400/0'
  },
  error: {
    container: 'bg-red-50/50 border-red-200/50 text-red-900 dark:bg-red-950/30 dark:border-red-800/50 dark:text-red-100 backdrop-blur-md',
    icon: <XCircle className="w-5 h-5 text-red-500" />,
    shimmer: 'from-red-400/0 via-red-400/20 to-red-400/0'
  },
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'default',
  title,
  description,
  icon,
  dismissible = false,
  onDismiss,
  className,
  children,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const config = variantConfig[variant];
  const content = children || description;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className={cn(
            'relative group flex gap-4 rounded-xl border p-4 overflow-hidden',
            config.container,
            className
          )}
          role="alert"
        >
          {/* Subtle animated shimmer */}
          <div
            className={cn(
              "absolute inset-0 bg-linear-to-r -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none opacity-50",
              config.shimmer
            )}
          />

          <div className="shrink-0 mt-0.5">
            {icon || config.icon}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            {title && (
              <h5 className="font-bold text-sm leading-none tracking-tight">
                {title}
              </h5>
            )}
            {content && (
              <div className="text-sm opacity-90 leading-relaxed font-medium">
                {content}
              </div>
            )}
          </div>

          {dismissible && (
            <button
              onClick={handleDismiss}
              className="shrink-0 p-1 h-fit rounded-lg opacity-40 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-all active:scale-95"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Alert;
