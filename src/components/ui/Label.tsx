/**
 * Component: Label
 * Location: components/ui/Label.tsx
 */

'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  disabled?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(({
  className,
  required = false,
  disabled = false,
  children,
  ...props
}, ref) => (
  <label
    ref={ref}
    className={cn(
      'text-sm font-medium text-[var(--foreground)] block mb-1.5',
      disabled && 'opacity-50 cursor-not-allowed',
      className
    )}
    {...props}
  >
    {children}
    {required && <span className="text-[var(--destructive)] ml-1">*</span>}
  </label>
));

Label.displayName = 'Label';
export default Label;
