'use client';

import React from 'react';
import { useTracker } from '@/hooks/useTracker';

interface TrackerDashboardProps {
  className?: string;
}

export const TrackerDashboard: React.FC<TrackerDashboardProps> = ({
  className = '',
}) => {
  const { stats, summary, isLoadingStats, isLoadingSummary } = useTracker();

  const isLoading = isLoadingStats || isLoadingSummary;

  if (isLoading) return <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />;

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl p-6">
          <div className="text-4xl font-bold">{summary?.totals.entries || 0}</div>
          <div className="text-sm opacity-90">Total Entries</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl p-6">
          <div className="text-4xl font-bold">{stats?.thisWeek.problems || 0}</div>
          <div className="text-sm opacity-90">Problems This Week</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-xl p-6">
          <div className="text-4xl font-bold">{stats?.today?.totalProblems || 0}</div>
          <div className="text-sm opacity-90">Problems Today</div>
        </div>
      </div>
    </div>
  );
};

export default TrackerDashboard;
