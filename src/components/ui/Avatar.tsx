/**
 * Component: Avatar
 * Location: components/ui/Avatar.tsx
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallback?: React.ReactNode;
  status?: 'online' | 'offline' | 'away' | 'busy';
}

const sizeStyles = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
};

const statusStyles = {
  online: 'bg-emerald-500',
  offline: 'bg-zinc-400',
  away: 'bg-amber-500',
  busy: 'bg-red-500',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  fallback,
  status,
  className,
  ...props
}) => {
  const [error, setError] = React.useState(false);
  const initials = name
    ? name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    : '?';

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 font-bold text-zinc-600 dark:text-zinc-400',
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {src && !error ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className="h-full w-full rounded-full object-cover"
          onError={() => setError(true)}
        />
      ) : (
        fallback || initials
      )}

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-zinc-900',
            statusStyles[status]
          )}
        />
      )}
    </div>
  );
};

export const AvatarGroup: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn('flex -space-x-2 overflow-hidden', className)}>{children}</div>
);

export default Avatar;
