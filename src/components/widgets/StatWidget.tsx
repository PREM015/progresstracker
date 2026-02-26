/**
 * Component: StatWidget
 * Location: components/widgets/StatWidget.tsx
 * 
 * Description: Stat display widget for showing key metrics with trend indicators
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

export interface StatWidgetProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  className?: string;
}

const variantStyles = {
  default: 'text-[var(--foreground)]',
  primary: 'text-[var(--primary)]',
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  error: 'text-red-500',
};

const sizeStyles = {
  sm: { title: 'text-xs', value: 'text-xl', icon: 'w-8 h-8' },
  md: { title: 'text-sm', value: 'text-2xl', icon: 'w-10 h-10' },
  lg: { title: 'text-base', value: 'text-3xl', icon: 'w-12 h-12' },
};

const TrendUp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
  </svg>
);

const TrendDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
  </svg>
);

const SkeletonLoader: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => (
  <div className="animate-pulse">
    <div className={cn('bg-[var(--sidebar-bg)] rounded h-4 w-24 mb-2', size === 'sm' && 'h-3 w-20')} />
    <div className={cn('bg-[var(--sidebar-bg)] rounded h-8 w-16', size === 'lg' && 'h-10 w-20')} />
  </div>
);

export const StatWidget: React.FC<StatWidgetProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  size = 'md',
  loading = false,
  className,
}) => {
  const styles = sizeStyles[size];
  const trendColor = trend?.direction === 'up' ? 'text-emerald-500' : trend?.direction === 'down' ? 'text-red-500' : 'text-[var(--text-muted)]';

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {loading ? (
            <SkeletonLoader size={size} />
          ) : (
            <>
              <p className={cn('font-medium text-[var(--text-muted)] mb-1', styles.title)}>{title}</p>
              <p className={cn('font-bold', styles.value, variantStyles[variant])}>{value}</p>
              {subtitle && <p className="text-xs text-[var(--text-muted)] mt-1">{subtitle}</p>}
              {trend && (
                <div className={cn('flex items-center gap-1 mt-2', trendColor)}>
                  {trend.direction === 'up' ? <TrendUp /> : trend.direction === 'down' ? <TrendDown /> : null}
                  <span className="text-sm font-medium">{trend.value > 0 ? '+' : ''}{trend.value}%</span>
                  {trend.label && <span className="text-xs text-[var(--text-muted)]">{trend.label}</span>}
                </div>
              )}
            </>
          )}
        </div>
        {icon && (
          <div className={cn(
            'flex items-center justify-center rounded-lg bg-[var(--primary)]/10',
            styles.icon,
            variantStyles[variant]
          )}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

export default StatWidget;
