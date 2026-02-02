/**
 * Component: Checkbox
 * Location: components/ui/Checkbox.tsx
 */

'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  error?: boolean;
}

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
  </svg>
);

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  className,
  label,
  description,
  error = false,
  disabled,
  id,
  ...props
}, ref) => {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <div className="relative flex items-center justify-center">
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          disabled={disabled}
          className={cn(
            'peer h-5 w-5 cursor-pointer appearance-none rounded border-2 bg-[var(--card-bg)]',
            'transition-all duration-200',
            'checked:bg-[var(--primary)] checked:border-[var(--primary)]',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)]/50',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error ? 'border-[var(--destructive)]' : 'border-[var(--card-border)]'
          )}
          {...props}
        />
        <span className="pointer-events-none absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity">
          <CheckIcon />
        </span>
      </div>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <label htmlFor={checkboxId} className={cn('text-sm font-medium text-[var(--foreground)] cursor-pointer', disabled && 'opacity-50 cursor-not-allowed')}>
              {label}
            </label>
          )}
          {description && <span className="text-xs text-[var(--text-muted)] mt-0.5">{description}</span>}
        </div>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';
export default Checkbox;
