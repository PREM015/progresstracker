/**
 * Component: TimeAgo
 * Location: components/widgets/TimeAgo.tsx
 */

'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { formatDate, getRelativeTime } from '@/lib/utils';

export interface TimeAgoProps {
  date: Date | string;
  className?: string;
  showTooltip?: boolean;
}

export const TimeAgo: React.FC<TimeAgoProps> = ({
  date,
  className,
  showTooltip = true,
}) => {
  const [relativeTime, setRelativeTime] = useState<string>('');
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  useEffect(() => {
    setRelativeTime(getRelativeTime(dateObj));

    const interval = setInterval(() => {
      setRelativeTime(getRelativeTime(dateObj));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [dateObj]);

  return (
    <span
      className={cn('text-current', className)}
      title={showTooltip ? formatDate(dateObj, 'long') : undefined}
    >
      {relativeTime}
    </span>
  );
};

export default TimeAgo;
