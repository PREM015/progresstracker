'use client';

import React, { useState, useEffect } from 'react';

interface TrackerDashboardProps {
  className?: string;
}

export const TrackerDashboard: React.FC<TrackerDashboardProps> = ({
  className = '',
}) => {
  const [stats, setStats] = useState({ total: 0, thisWeek: 0, today: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/tracker/stats')
      .then(r => r.json())
      .then(data => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />;

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl p-6">
          <div className="text-4xl font-bold">{stats.total}</div>
          <div className="text-sm opacity-90">Total Entries</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl p-6">
          <div className="text-4xl font-bold">{stats.thisWeek}</div>
          <div className="text-sm opacity-90">This Week</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-xl p-6">
          <div className="text-4xl font-bold">{stats.today}</div>
          <div className="text-sm opacity-90">Today</div>
        </div>
      </div>
    </div>
  );
};

export default TrackerDashboard;
