/**
 * Component: Skeleton
 * Location: components/ui/Skeleton.tsx
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  className?: string;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular', width, height, className, animate = true
}) => {
  const baseStyles = cn(
    'bg-[var(--sidebar-bg)]',
    animate && 'animate-pulse',
    variant === 'circular' && 'rounded-full',
    variant === 'text' && 'rounded h-4',
    variant === 'rectangular' && 'rounded-lg'
  );

  return (
    <div
      className={cn(baseStyles, className)}
      style={{ width: width ?? (variant === 'text' ? '100%' : undefined), height: height ?? (variant === 'circular' ? width : undefined) }}
    />
  );
};

// Pre-built skeleton patterns
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ lines = 3, className }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} variant="text" width={i === lines - 1 ? '70%' : '100%'} />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-4 rounded-lg border border-[var(--card-border)]', className)}>
    <Skeleton variant="rectangular" height={120} className="mb-4" />
    <Skeleton variant="text" width="60%" className="mb-2" />
    <Skeleton variant="text" width="100%" />
    <Skeleton variant="text" width="80%" />
  </div>
);

export const SkeletonAvatar: React.FC<{ size?: number; className?: string }> = ({ size = 40, className }) => (
  <Skeleton variant="circular" width={size} height={size} className={className} />
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number; className?: string }> = ({ rows = 5, cols = 4, className }) => (
  <div className={cn('space-y-2', className)}>
    <div className="flex gap-4 p-3 bg-[var(--sidebar-bg)] rounded-t-lg">
      {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} variant="text" height={20} />)}
    </div>
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div key={rowIdx} className="flex gap-4 p-3 border-b border-[var(--card-border)]">
        {Array.from({ length: cols }).map((_, colIdx) => <Skeleton key={colIdx} variant="text" height={16} />)}
      </div>
    ))}
  </div>
);

export default Skeleton;
