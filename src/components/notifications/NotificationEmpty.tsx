

import { cn } from '@/lib/utils';

/**
 * NotificationEmpty Component
 * 
 * @description TODO: Add component description
 * @created 2026-01-26
 */

interface NotificationEmptyProps {
  className?: string;
  // TODO: Add more props
}

export function NotificationEmpty({ className }: NotificationEmptyProps) {
  return (
    <div className={cn('notificationempty', className)}>
      {/* TODO: Implement component */}
      <p>NotificationEmpty Component</p>
    </div>
  );
}

export default NotificationEmpty;
