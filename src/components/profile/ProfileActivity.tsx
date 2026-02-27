'use client';

import React from 'react';

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

interface ProfileActivityProps {
  activities: Activity[];
  className?: string;
}

export const ProfileActivity: React.FC<ProfileActivityProps> = ({
  activities,
  className = '',
}) => {
  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      problem: '✅',
      goal: '🎯',
      achievement: '🏆',
      sync: '🔄',
    };
    return icons[type] || '📌';
  };

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold mb-6">Recent Activity</h3>

      <div className="space-y-4">
        {activities.map(activity => (
          <div key={activity.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <span className="text-2xl">{getActivityIcon(activity.type)}</span>
            <div className="flex-1">
              <div className="font-medium">{activity.description}</div>
              <div className="text-sm text-gray-600 mt-1">
                {new Date(activity.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        ))}

        {activities.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No recent activity
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileActivity;
