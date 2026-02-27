"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function UserActivityPage() {
  const params = useParams();
  const username = params.username as string;

  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/profile/${username}/activity`)
      .then(r => r.json())
      .then(data => setActivities(data.activities || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      goal: '🎯',
      achievement: '🏆',
      problem: '💡',
      commit: '📝',
      streak: '🔥',
    };
    return icons[type] || '📊';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">@{username}'s Activity</h1>

        {activities.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
            <span className="text-5xl">📊</span>
            <p className="mt-4 text-gray-500">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{activity.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
