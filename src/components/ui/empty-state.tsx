// src/components/ui/empty-state.tsx
// Empty state illustration component

import React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  emoji?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: { wrapper: 'py-8 px-4', icon: 'text-3xl', title: 'text-sm', desc: 'text-xs', gap: 'gap-2' },
  md: { wrapper: 'py-12 px-6', icon: 'text-5xl', title: 'text-base', desc: 'text-sm', gap: 'gap-3' },
  lg: { wrapper: 'py-16 px-8', icon: 'text-7xl', title: 'text-lg', desc: 'text-base', gap: 'gap-4' },
};

export function EmptyState({
  icon,
  emoji,
  title,
  description,
  action,
  className,
  size = 'md',
}: EmptyStateProps) {
  const s = sizeConfig[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        s.wrapper,
        s.gap,
        className
      )}
    >
      {/* Illustration */}
      {(icon || emoji) && (
        <div className={cn('flex items-center justify-center', s.icon)}>
          {emoji ? <span role="img" aria-hidden="true">{emoji}</span> : icon}
        </div>
      )}

      {/* Text */}
      <div className={cn('flex flex-col items-center', size === 'lg' ? 'gap-2' : 'gap-1')}>
        <h3 className={cn('font-semibold text-foreground', s.title)}>{title}</h3>
        {description && (
          <p className={cn('text-muted-foreground max-w-sm', s.desc)}>{description}</p>
        )}
      </div>

      {/* Action */}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/** Empty state with a dashed border card */
export function EmptyStateCard({ className, ...props }: EmptyStateProps) {
  return (
    <div className={cn('rounded-lg border-2 border-dashed border-border', className)}>
      <EmptyState {...props} />
    </div>
  );
}
