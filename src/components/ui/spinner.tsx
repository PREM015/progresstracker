// src/components/ui/spinner.tsx
// Loading spinner component

import React from 'react';
import { cn } from '@/lib/utils';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  label?: string;
  color?: 'primary' | 'white' | 'current';
}

const sizeClasses: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3 border-[1.5px]',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
  xl: 'h-12 w-12 border-4',
};

const colorClasses: Record<NonNullable<SpinnerProps['color']>, string> = {
  primary: 'border-primary border-t-transparent',
  white: 'border-white border-t-transparent',
  current: 'border-current border-t-transparent',
};

export function Spinner({ size = 'md', className, label = 'Loading...', color = 'primary' }: SpinnerProps) {
  return (
    <div role="status" aria-label={label} className={cn('inline-flex items-center justify-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full',
          sizeClasses[size],
          colorClasses[color]
        )}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Full-page loading overlay */
export function SpinnerOverlay({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="xl" />
        <p className="text-sm text-muted-foreground animate-pulse">{label}</p>
      </div>
    </div>
  );
}

/** Center spinner inside a relative container */
export function SpinnerCentered({ size = 'lg', className }: Pick<SpinnerProps, 'size' | 'className'>) {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <Spinner size={size} />
    </div>
  );
}
