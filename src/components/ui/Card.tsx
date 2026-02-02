/**
 * Component: Card
 * Location: components/ui/Card.tsx
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card = Object.assign(
  React.forwardRef<HTMLDivElement, CardProps>(({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--foreground)] shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )),
  {
    Header: ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
    ),
    Title: ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h3 className={cn('text-lg font-black leading-none tracking-tight', className)} {...props} />
    ),
    /** Description: Base card container component. */
    Description: ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p className={cn('text-sm text-[var(--text-muted)]', className)} {...props} />
    ),
    Content: ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={cn('p-6 pt-0', className)} {...props} />
    ),
    Footer: ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
    ),
  }
);

Card.displayName = 'Card';

export default Card;
