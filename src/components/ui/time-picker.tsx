// src/components/ui/time-picker.tsx
// Time picker component (styled native input)

'use client';

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value?: string; // HH:mm
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  step?: number; // seconds, e.g. 900 = 15 min steps
  className?: string;
  disabled?: boolean;
  id?: string;
  required?: boolean;
  'aria-label'?: string;
}

export function TimePicker({
  value = '',
  onChange,
  min,
  max,
  step,
  className,
  disabled,
  id,
  required,
  'aria-label': ariaLabel,
}: TimePickerProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    [onChange]
  );

  return (
    <input
      id={id}
      type="time"
      value={value}
      onChange={handleChange}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      required={required}
      aria-label={ariaLabel ?? 'Time'}
      className={cn(
        'h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring transition-shadow',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        '[color-scheme:auto]',
        className
      )}
    />
  );
}

/** Combined DateTime picker */
interface DateTimePickerProps {
  date?: string;
  time?: string;
  onDateChange: (v: string) => void;
  onTimeChange: (v: string) => void;
  className?: string;
  disabled?: boolean;
}

export function DateTimePicker({ date = '', time = '', onDateChange, onTimeChange, className, disabled }: DateTimePickerProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <input
        type="date"
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
        disabled={disabled}
        className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow disabled:opacity-50 [color-scheme:auto]"
      />
      <TimePicker value={time} onChange={onTimeChange} disabled={disabled} />
    </div>
  );
}
