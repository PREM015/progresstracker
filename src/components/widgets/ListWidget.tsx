/**
 * Component: ListWidget
 * Location: components/widgets/ListWidget.tsx
 * 
 * Description: List display widget for showing items with actions
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

export interface ListItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: { label: string; variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' };
  icon?: React.ReactNode;
  meta?: string;
  onClick?: () => void;
}

export interface ListWidgetProps {
  title?: string;
  items: ListItem[];
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  showViewAll?: boolean;
  onViewAll?: () => void;
  loading?: boolean;
  loadingCount?: number;
  maxItems?: number;
  className?: string;
}

const ListItemSkeleton = () => (
  <div className="flex items-center gap-3 p-3 animate-pulse">
    <Skeleton variant="circular" width={40} height={40} />
    <div className="flex-1">
      <Skeleton variant="text" width="60%" height={16} className="mb-1" />
      <Skeleton variant="text" width="40%" height={14} />
    </div>
  </div>
);

export const ListWidget: React.FC<ListWidgetProps> = ({
  title,
  items,
  emptyMessage = 'No items to display',
  emptyIcon,
  showViewAll = false,
  onViewAll,
  loading = false,
  loadingCount = 3,
  maxItems,
  className,
}) => {
  const displayItems = maxItems ? items.slice(0, maxItems) : items;
  const hasMore = maxItems ? items.length > maxItems : false;

  return (
    <Card className={cn('', className)}>
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)]">
          <h3 className="font-semibold text-[var(--foreground)]">{title}</h3>
          {(showViewAll || hasMore) && onViewAll && (
            <Button variant="link" size="sm" onClick={onViewAll}>
              View all
            </Button>
          )}
        </div>
      )}

      <div className="divide-y divide-[var(--card-border)]">
        {loading ? (
          Array.from({ length: loadingCount }).map((_, i) => <ListItemSkeleton key={i} />)
        ) : displayItems.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={emptyIcon} title={emptyMessage} />
          </div>
        ) : (
          displayItems.map((item) => (
            <div
              key={item.id}
              onClick={item.onClick}
              className={cn(
                'flex items-center gap-3 px-4 py-3 transition-colors',
                item.onClick && 'cursor-pointer hover:bg-[var(--sidebar-bg)]'
              )}
            >
              {item.icon && (
                <div className="shrink-0 w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                  {item.icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--foreground)] truncate">{item.title}</span>
                  {item.badge && (
                    <Badge variant={item.badge.variant || 'default'} size="sm">
                      {item.badge.label}
                    </Badge>
                  )}
                </div>
                {item.subtitle && (
                  <p className="text-sm text-[var(--text-muted)] truncate">{item.subtitle}</p>
                )}
              </div>
              {item.meta && (
                <span className="shrink-0 text-xs text-[var(--text-muted)]">{item.meta}</span>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

export default ListWidget;
