/**
 * Component: Spinner
 * Location: components/ui/Spinner.tsx
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'secondary' | 'white';
  className?: string;
}

const sizeStyles = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
  xl: 'w-12 h-12 border-[3px]',
};

const variantStyles = {
  default: 'border-[var(--card-border)] border-t-[var(--foreground)]',
  primary: 'border-[var(--primary)]/30 border-t-[var(--primary)]',
  secondary: 'border-[var(--secondary)]/30 border-t-[var(--secondary)]',
  white: 'border-white/30 border-t-white',
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', variant = 'default', className }) => (
  <div
    className={cn('rounded-full animate-spin', sizeStyles[size], variantStyles[variant], className)}
    role="status"
    aria-label="Loading"
  />
);

export const SpinnerWithText: React.FC<SpinnerProps & { text?: string }> = ({ text = 'Loading...', ...props }) => (
  <div className="flex items-center gap-2">
    <Spinner {...props} />
    <span className="text-sm text-[var(--text-muted)]">{text}</span>
  </div>
);

export const FullPageSpinner: React.FC<SpinnerProps & { text?: string }> = ({ text, ...props }) => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-[var(--background)]/80 backdrop-blur-sm z-50">
    <Spinner size="xl" {...props} />
    {text && <p className="mt-4 text-[var(--text-muted)]">{text}</p>}
  </div>
);

export default Spinner;
