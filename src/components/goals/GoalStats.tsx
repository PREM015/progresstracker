'use client';

import React, { useState } from 'react';

interface GoalStatsProps {
  userId: string;
  className?: string;
}

interface Stats {
  totalGoals: number;
  completedGoals: number;
  activeGoals: number;
  completionRate: number;
  averageProgress: number;
  goalsByCategory: Array<{ category: string; count: number }>;
  goalsByPriority: { low: number; medium: number; high: number };
}

export const GoalStats: React.FC<GoalStatsProps> = ({
  userId,
  className = '',
}) => {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/goals/stats')
      .then(r => r.json())
      .then(data => setStats(data))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-32 bg-gray-200 rounded-xl"></div>
      <div className="h-48 bg-gray-200 rounded-xl"></div>
    </div>;
  }

  if (!stats) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6">
          <div className="text-3xl font-bold">{stats.totalGoals}</div>
          <div className="text-sm opacity-90">Total Goals</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6">
          <div className="text-3xl font-bold">{stats.completedGoals}</div>
          <div className="text-sm opacity-90">Completed</div>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl p-6">
          <div className="text-3xl font-bold">{stats.activeGoals}</div>
          <div className="text-sm opacity-90">Active</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6">
          <div className="text-3xl font-bold">{stats.completionRate}%</div>
          <div className="text-sm opacity-90">Success Rate</div>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-bold text-gray-900 mb-4">Goals by Category</h3>
        <div className="space-y-3">
          {stats.goalsByCategory.map((cat, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{cat.category || 'Uncategorized'}</span>
              <span className="text-sm font-bold text-gray-900">{cat.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Priority Distribution */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-bold text-gray-900 mb-4">Priority Distribution</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-sm text-gray-700 flex-1">High Priority</span>
            <span className="text-sm font-bold text-gray-900">{stats.goalsByPriority.high}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span className="text-sm text-gray-700 flex-1">Medium Priority</span>
            <span className="text-sm font-bold text-gray-900">{stats.goalsByPriority.medium}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-700 flex-1">Low Priority</span>
            <span className="text-sm font-bold text-gray-900">{stats.goalsByPriority.low}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalStats;
