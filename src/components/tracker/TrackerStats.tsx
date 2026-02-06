'use client';

import React, { useState, useEffect } from 'react';

interface TrackerStatsProps {
  className?: string;
}

export const TrackerStats: React.FC<TrackerStatsProps> = ({
  className = '',
}) => {
  const [stats, setStats] = useState({ total: 0, avg: 0, max: 0, platforms: 0 });

  useEffect(() => {
    fetch('/api/tracker/stats')
      .then(r => r.json())
      .then(data => setStats(data));
  }, []);

  return (
    <div className={`grid grid-cols-4 gap-4 ${className}`}>
      {[
        { label: 'Total Entries', value: stats.total, icon: '📊' },
        { label: 'Avg per Day', value: stats.avg, icon: '📈' },
        { label: 'Max in Day', value: stats.max, icon: '🚀' },
        { label: 'Platforms', value: stats.platforms, icon: '🔗' },
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
