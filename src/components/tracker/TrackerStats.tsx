'use client';

import React from 'react';
import { useTracker } from '@/hooks/useTracker';

interface TrackerStatsProps {
  className?: string;
}

export const TrackerStats: React.FC<TrackerStatsProps> = ({
  className = '',
}) => {
  const { summary, isLoadingSummary } = useTracker();

  if (isLoadingSummary || !summary) {
    return (
      <div className={`grid grid-cols-4 gap-4 ${className}`}>
        {[1, 2, 3, 4].map(idx => (
          <div key={idx} className="bg-white border rounded-xl p-6 h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-4 gap-4 ${className}`}>
      {[
        { label: 'Total Entries', value: summary.totals.entries, icon: '📊' },
        { label: 'Avg per Day', value: Math.round(summary.averages.problemsPerDay * 10) / 10, icon: '📈' },
        { label: 'Max in Day', value: summary.mostProductiveDay?.problems || 0, icon: '🚀' },
        { label: 'Platforms', value: summary.byPlatform.length, icon: '🔗' },
      ].map((stat, idx) => (
        <div key={idx} className="bg-white border rounded-xl p-6 text-center">
          <div className="text-3xl mb-2">{stat.icon}</div>
          <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
          <div className="text-sm text-gray-600">{stat.label}</div>
        </div>
      ))}
    </div>
  );
};

export default TrackerStats;
