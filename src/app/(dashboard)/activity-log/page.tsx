"use client";

import { useState, useEffect } from "react";

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch(`/api/user/activity?filter=${filter}`)
      .then(r => r.json())
      .then(data => setActivities(data.activities || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [filter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      goal_completed: "🎯",
      achievement_unlocked: "🏆",
      platform_connected: "🔗",
      streak_milestone: "🔥",
      problem_solved: "💡",
      sync_completed: "🔄",
      profile_updated: "👤",
    };
    return icons[type] || "📝";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Activity Log</h1>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg"
          >
            <option value="all">All Activity</option>
            <option value="goals">Goals</option>
            <option value="achievements">Achievements</option>
            <option value="platforms">Platforms</option>
            <option value="syncs">Syncs</option>
          </select>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {activities.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-5xl">📊</span>
              <p className="mt-4 text-gray-500">No activity yet</p>
              <p className="text-sm text-gray-400 mt-2">Your activity history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {activities.map((activity, idx) => (
                <div key={idx} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{getActivityIcon(activity.type)}</div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{activity.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {activity.metadata && (
                      <div className="text-right">
                        {activity.metadata.points && (
                          <span className="text-sm font-medium text-indigo-600">
                            +{activity.metadata.points} points
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
