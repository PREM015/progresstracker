/**
 * Component: ProgressWidget
 * Location: components/widgets/ProgressWidget.tsx
 * 
 * Description: Progress display widget with circular or linear options
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Progress, CircularProgress } from '@/components/ui/Progress';

export interface ProgressWidgetProps {
  title: string;
  value: number;
  max?: number;
  subtitle?: string;
  type?: 'linear' | 'circular';
  variant?: 'default' | 'success' | 'warning' | 'error';
  showValue?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

const variantMap = {
  default: 'default' as const,
  success: 'success' as const,
  warning: 'warning' as const,
  error: 'error' as const,
};

export const ProgressWidget: React.FC<ProgressWidgetProps> = ({
  title,
  value,
  max = 100,
  subtitle,
  type = 'linear',
  variant = 'default',
  showValue = true,
  icon,
  loading = false,
  className,
}) => {
  const percentage = Math.round((value / max) * 100);

  return (
    <Card className={cn('', className)}>
      <div className="flex items-start gap-4">
        {type === 'circular' && (
          <div className="shrink-0">
            {loading ? (
              <div className="w-12 h-12 rounded-full bg-[var(--sidebar-bg)] animate-pulse" />
            ) : (
              <CircularProgress value={percentage} size={48} />
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {icon && <span className="text-[var(--primary)]">{icon}</span>}
              <h4 className="font-medium text-[var(--foreground)]">{title}</h4>
            </div>
            {showValue && type === 'linear' && !loading && (
              <span className="text-sm font-semibold text-[var(--foreground)]">{percentage}%</span>
            )}
          </div>

          {type === 'linear' && (
            loading ? (
              <div className="h-2 rounded-full bg-[var(--sidebar-bg)] animate-pulse" />
            ) : (
              <Progress value={value} max={max} variant={variantMap[variant]} animated={false} />
            )
          )}

          {subtitle && (
            <p className="text-xs text-[var(--text-muted)] mt-2">{subtitle}</p>
          )}
        </div>
      </div>
    </Card>
  );
};

// Compact version for lists
export const ProgressItem: React.FC<{ label: string; value: number; max?: number; className?: string }> = ({
  label, value, max = 100, className
}) => (
  <div className={cn('py-2', className)}>
    <div className="flex items-center justify-between mb-1">
      <span className="text-sm text-[var(--foreground)]">{label}</span>
      <span className="text-xs text-[var(--text-muted)]">{Math.round((value / max) * 100)}%</span>
    </div>
    <Progress value={value} max={max} size="sm" animated={false} />
  </div>
);

export default ProgressWidget;
