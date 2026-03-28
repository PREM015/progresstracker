// src/components/ui/date-picker.tsx
// Date picker component (wraps native input with styling)

'use client';

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value?: string; // ISO date string YYYY-MM-DD
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  required?: boolean;
  'aria-label'?: string;
}

function formatDisplayDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return iso; }
}

export function DatePicker({
  value = '',
  onChange,
  min,
  max,
  placeholder = 'Select date...',
  className,
  disabled,
  id,
  required,
  'aria-label': ariaLabel,
}: DatePickerProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    [onChange]
  );

  return (
    <div className={cn('relative', className)}>
      <input
        id={id}
        type="date"
        value={value}
        onChange={handleChange}
        min={min}
        max={max}
        disabled={disabled}
        required={required}
        aria-label={ariaLabel ?? placeholder}
        className={cn(
          'h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring transition-shadow',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          '[color-scheme:auto]'
        )}
      />
    </div>
  );
}

/** Date range picker */
interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  className?: string;
  disabled?: boolean;
}

export function DateRangePicker({ startDate = '', endDate = '', onStartChange, onEndChange, className, disabled }: DateRangePickerProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DatePicker value={startDate} onChange={onStartChange} max={endDate || undefined} disabled={disabled} aria-label="Start date" />
      <span className="text-muted-foreground text-sm">→</span>
      <DatePicker value={endDate} onChange={onEndChange} min={startDate || undefined} disabled={disabled} aria-label="End date" />
    </div>
  );
}
