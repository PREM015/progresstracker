/**
 * Component: FormError
 * Location: components/ui/FormError.tsx
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface FormErrorProps {
  message?: string | null;
  className?: string;
}

const ErrorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
  </svg>
);

export const FormError: React.FC<FormErrorProps> = ({ message, className }) => {
  if (!message) return null;

  return (
    <div className={cn('flex items-center gap-1.5 text-sm text-[var(--destructive)] mt-1.5', className)} role="alert">
      <ErrorIcon />
      <span>{message}</span>
    </div>
  );
};

export const FormSuccess: React.FC<{ message?: string | null; className?: string }> = ({ message, className }) => {
  if (!message) return null;

  return (
    <div className={cn('flex items-center gap-1.5 text-sm text-[var(--success)] mt-1.5', className)} role="status">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
      </svg>
      <span>{message}</span>
    </div>
  );
};

export const FormHint: React.FC<{ message?: string; className?: string }> = ({ message, className }) => {
  if (!message) return null;

  return (
    <p className={cn('text-xs text-[var(--text-muted)] mt-1.5', className)}>
      {message}
    </p>
  );
};

export default FormError;
