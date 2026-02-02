/**
 * Component: Progress
 * Description: Base progress bar component.
 * Location: components/ui/Progress.tsx
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  animated?: boolean;
}

const sizeStyles = {
  xs: 'h-1',
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
};

const variantStyles = {
  default: 'bg-[var(--primary)]',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
};

export const Progress: React.FC<ProgressProps> = ({
  value = 0,
  max = 100,
  size = 'sm',
  variant = 'default',
  animated = true,
  className,
  ...props
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800',
        sizeStyles[size],
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'h-full w-full flex-1 transition-all duration-500 ease-out',
          variantStyles[variant],
          animated && 'animate-shimmer'
        )}
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
};

export interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value = 0,
  max = 100,
  size = 40,
  strokeWidth = 4,
  showValue = false,
  className,
  ...props
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg className="h-full w-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-zinc-100 dark:text-zinc-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          style={{ strokeDashoffset: offset }}
          className="text-[var(--primary)] transition-all duration-500 ease-out"
          strokeLinecap="round"
        />
      </svg>
      {showValue && (
        <span className="absolute text-[10px] font-bold">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
};

export default Progress;
