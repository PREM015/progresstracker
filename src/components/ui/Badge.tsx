/**
 * Component: Badge
 * Description: Base badge component.
 * Location: components/ui/Badge.tsx
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const variantStyles = {
  default: 'bg-zinc-100 text-zinc-900 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700',
  primary: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20',
  success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
  error: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
  outline: 'bg-transparent border-[var(--card-border)] text-[var(--text-muted)]',
  ghost: 'bg-transparent border-transparent text-[var(--text-muted)]',
};

const sizeStyles = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'sm',
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'inline-flex items-center font-bold uppercase tracking-widest rounded-full border transition-colors',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Badge;
