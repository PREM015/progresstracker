/**
 * Component: CountdownWidget
 * Location: components/widgets/CountdownWidget.tsx
 * 
 * Description: Countdown timer widget for displaying time remaining
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';

export interface CountdownWidgetProps {
  targetDate: Date;
  title?: string;
  subtitle?: string;
  showLabels?: boolean;
  variant?: 'default' | 'compact' | 'minimal';
  onComplete?: () => void;
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

const calculateTimeRemaining = (targetDate: Date): TimeRemaining => {
  const total = targetDate.getTime() - Date.now();

  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / 1000 / 60) % 60),
    seconds: Math.floor((total / 1000) % 60),
    total,
  };
};

const TimeUnit: React.FC<{ value: number; label: string; variant: 'default' | 'compact' | 'minimal' }> = ({ value, label, variant }) => {
  if (variant === 'minimal') {
    return <span className="font-mono font-bold">{String(value).padStart(2, '0')}</span>;
  }

  return (
    <div className={cn(
      'flex flex-col items-center',
      variant === 'compact' ? 'min-w-[40px]' : 'min-w-[60px]'
    )}>
      <div className={cn(
        'font-mono font-bold rounded-lg bg-[var(--sidebar-bg)] flex items-center justify-center',
        variant === 'compact' ? 'text-lg px-2 py-1' : 'text-2xl px-3 py-2'
      )}>
        {String(value).padStart(2, '0')}
      </div>
      <span className={cn(
        'text-[var(--text-muted)] mt-1',
        variant === 'compact' ? 'text-[10px]' : 'text-xs'
      )}>
        {label}
      </span>
    </div>
  );
};

const Separator: React.FC<{ variant: 'default' | 'compact' | 'minimal' }> = ({ variant }) => (
  <span className={cn(
    'font-bold text-[var(--text-muted)]',
    variant === 'minimal' ? 'mx-0.5' : 'mx-1',
    variant === 'default' && 'text-xl'
  )}>:</span>
);

export const CountdownWidget: React.FC<CountdownWidgetProps> = ({
  targetDate,
  title,
  subtitle,
  showLabels = true,
  variant = 'default',
  onComplete,
  className,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() => calculateTimeRemaining(targetDate));
  const [isComplete, setIsComplete] = useState(false);

  const tick = useCallback(() => {
    const remaining = calculateTimeRemaining(targetDate);
    setTimeRemaining(remaining);

    if (remaining.total <= 0 && !isComplete) {
      setIsComplete(true);
      onComplete?.();
    }
  }, [targetDate, isComplete, onComplete]);

  useEffect(() => {
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  if (variant === 'minimal') {
    return (
      <span className={cn('inline-flex items-center font-mono', className)}>
        {timeRemaining.days > 0 && (
          <>
            <span className="font-bold">{timeRemaining.days}d</span>
            <span className="mx-1">:</span>
          </>
        )}
        <TimeUnit value={timeRemaining.hours} label="H" variant="minimal" />
        <Separator variant="minimal" />
        <TimeUnit value={timeRemaining.minutes} label="M" variant="minimal" />
        <Separator variant="minimal" />
        <TimeUnit value={timeRemaining.seconds} label="S" variant="minimal" />
      </span>
    );
  }

  return (
    <Card className={cn('text-center', className)}>
      {title && <h3 className="font-semibold text-[var(--foreground)] mb-1">{title}</h3>}
      {subtitle && <p className="text-sm text-[var(--text-muted)] mb-4">{subtitle}</p>}

      <div className="flex items-center justify-center gap-1">
        {(timeRemaining.days > 0 || !showLabels) && (
          <>
            <TimeUnit value={timeRemaining.days} label="Days" variant={variant} />
            <Separator variant={variant} />
          </>
        )}
        <TimeUnit value={timeRemaining.hours} label="Hours" variant={variant} />
        <Separator variant={variant} />
        <TimeUnit value={timeRemaining.minutes} label="Minutes" variant={variant} />
        <Separator variant={variant} />
        <TimeUnit value={timeRemaining.seconds} label="Seconds" variant={variant} />
      </div>

      {isComplete && (
        <p className="text-emerald-500 font-medium mt-4">🎉 Complete!</p>
      )}
    </Card>
  );
};

export default CountdownWidget;
