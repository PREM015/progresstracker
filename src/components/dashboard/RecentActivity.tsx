'use client';

import React, { useState, useEffect } from 'react';

interface Activity {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category?: string | null;
  status?: string | null;
}

interface RecentActivityProps {
  className?: string;
  limit?: number;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    pagination?: {
      total?: number;
    };
  };
}

interface ActivityApiItem {
  id: string;
  action?: string | null;
  category?: string | null;
  description?: string | null;
  createdAt?: string;
  status?: string | null;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  className = '',
  limit = 10,
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchActivity = async () => {
      try {
        const res = await fetch(`/api/user/activity?limit=${limit}`);
        const json = (await res.json()) as ApiSuccess<ActivityApiItem[]>;

        if (!res.ok || !json?.success) {
          throw new Error('Failed to fetch activity');
        }

        const mapped = (json.data || []).map((item) => ({
          id: item.id,
          title: item.action ? item.action.replace(/_/g, ' ') : 'Activity',
          description: item.description || '',
          timestamp: item.createdAt || new Date().toISOString(),
          category: item.category || null,
          status: item.status || null,
        })) as Activity[];

        if (isMounted) {
          setActivities(mapped);
        }
      } catch (error) {
        console.error('Failed to load activity:', error);
        if (isMounted) {
          setActivities([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchActivity();

    return () => {
      isMounted = false;
    };
  }, [limit]);

  const getTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getBadge = (category?: string | null) => {
    if (!category) return 'AC';
    return category.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
        <button className="text-sm text-indigo-600 hover:text-indigo-700">View All</button>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-sm uppercase tracking-widest mb-2">No activity</div>
          Your recent actions will show up here.
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-semibold">
                {getBadge(activity.category)}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate">{activity.title}</h4>
                <p className="text-sm text-gray-600 truncate">{activity.description}</p>
              </div>

              <div className="flex-shrink-0 text-xs text-gray-500">
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
