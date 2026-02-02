/**
 * Component: EmptyState
 * Location: components/ui/EmptyState.tsx
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const DefaultIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </svg>
);

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon, title, description, action, secondaryAction, className
}) => (
  <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
    <div className="text-[var(--text-muted)] mb-4">
      {icon || <DefaultIcon />}
    </div>
    <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">{title}</h3>
    {description && <p className="text-sm text-[var(--text-muted)] max-w-md mb-6">{description}</p>}
    {(action || secondaryAction) && (
      <div className="flex items-center gap-3">
        {action && (
          <Button variant={action.variant || 'primary'} onClick={action.onClick}>
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button variant="ghost" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    )}
  </div>
);

export default EmptyState;
