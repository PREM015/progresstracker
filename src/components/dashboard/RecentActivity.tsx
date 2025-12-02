'use client';

import  Card  from '@/components/ui/Card';
import  Badge  from '@/components/ui/Badge';
import { formatDate, formatTime } from '@/lib/date';
import { Code2, Clock } from 'lucide-react';

interface Activity {
  id: string;
  date: Date;
  platform?: string;
  problems?: number;
  timeSpent?: number;
  notes?: string;
}

interface RecentActivityProps {
  activities: Activity[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <p className="text-gray-500 text-center py-8">No recent activity to display</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
      
      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {activity.platform && (
                  <Badge variant="secondary">{activity.platform}</Badge>
                )}
                <span className="text-sm text-gray-500">
                  {formatDate(activity.date)}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                {activity.problems && activity.problems > 0 && (
                  <span className="text-gray-700 dark:text-gray-300">
                    <strong>{activity.problems}</strong> problems solved
                  </span>
                )}
                {activity.timeSpent && activity.timeSpent > 0 && (
                  <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    {formatTime(activity.timeSpent)}
                  </span>
                )}
              </div>
              
              {activity.notes && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                  {activity.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}