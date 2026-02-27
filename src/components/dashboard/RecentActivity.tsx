'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string | Date;
  category?: string | null;
  status?: string | null;
}

interface RecentActivityProps {
  activities: ActivityItem[];
  className?: string;
  isLoading?: boolean;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  activities = [],
  className = '',
  isLoading = false,
}) => {
  const getTimeAgo = (timestamp: string | Date) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      return 'recently';
    }
  };

  const getBadge = (category?: string | null) => {
    if (!category) return 'AC';
    return category.slice(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-900 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Recent Activity</h3>
        <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">View All</button>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
          <div className="text-sm uppercase tracking-widest mb-2">No activity</div>
          Your recent actions will show up here.
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-lg transition-colors">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-xs font-semibold">
                {getBadge(activity.category)}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 truncate">{activity.title}</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">{activity.description}</p>
              </div>

              <div className="flex-shrink-0 text-xs text-zinc-500 dark:text-zinc-500">
                {getTimeAgo(activity.timestamp)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
