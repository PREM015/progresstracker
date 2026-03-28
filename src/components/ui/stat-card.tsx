// src/components/ui/stat-card.tsx
// Statistics card component

import React from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number; // e.g. 12.5 for 12.5%
    label?: string;
    positive?: boolean | 'auto'; // 'auto' infers from sign of value
  };
  badge?: React.ReactNode;
  className?: string;
  isLoading?: boolean;
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

const colorClasses = {
  default: '',
  primary: 'ring-1 ring-primary/20 bg-primary/5 dark:bg-primary/10',
  success: 'ring-1 ring-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20',
  warning: 'ring-1 ring-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20',
  danger: 'ring-1 ring-red-500/20 bg-red-50/50 dark:bg-red-950/20',
  info: 'ring-1 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20',
};

export function StatCard({
  title, value, description, icon, trend, badge, className, isLoading, color = 'default',
}: StatCardProps) {
  const trendPositive = trend
    ? trend.positive === 'auto' ? trend.value >= 0 : (trend.positive ?? true)
    : null;

  return (
    <div
      className={cn(
        'relative rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md',
        colorClasses[color],
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">
            {title}
          </p>

          {isLoading ? (
            <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
          ) : (
            <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
          )}
        </div>

        {icon && (
          <div className="shrink-0 rounded-lg bg-muted p-2 text-muted-foreground">
            {icon}
          </div>
        )}
      </div>

      {/* Footer */}
      {(trend || description || badge) && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {trend && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-xs font-medium',
                  trendPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                )}
              >
                <span>{trendPositive ? '↑' : '↓'}</span>
                {Math.abs(trend.value)}%
              </span>
            )}
            {(description || trend?.label) && (
              <span className="text-xs text-muted-foreground">
                {trend?.label ?? description}
              </span>
            )}
          </div>
          {badge && <div>{badge}</div>}
        </div>
      )}
    </div>
  );
}

/** Grid wrapper for stat cards */
export function StatCardGrid({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const cols = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' };
  return (
    <div className={cn('grid grid-cols-1 gap-4', cols[columns], className)}>
      {children}
    </div>
  );
}
