'use client';

import React, { useState, useEffect } from 'react';

interface OverviewStat {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

interface OverviewStatsProps {
  className?: string;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface SummaryResponse {
  stats: {
    problems: number;
    commits: number;
    time: number;
    points: number;
  };
  changes: {
    problems: number;
    commits: number;
    time: number;
  };
}

export const OverviewStats: React.FC<OverviewStatsProps> = ({
  className = '',
}) => {
  const [stats, setStats] = useState<OverviewStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchSummary = async () => {
      try {
        const res = await fetch('/api/analytics/summary?period=week');
        const json = (await res.json()) as ApiSuccess<SummaryResponse>;
        if (!res.ok || !json?.success) throw new Error('Failed to fetch overview stats');

        const data = json.data;
        const mapped: OverviewStat[] = [
          {
            label: 'Problems Solved',
            value: data.stats.problems,
            change: data.changes.problems,
            trend: data.changes.problems > 0 ? 'up' : data.changes.problems < 0 ? 'down' : 'neutral',
          },
          {
            label: 'Commits',
            value: data.stats.commits,
            change: data.changes.commits,
            trend: data.changes.commits > 0 ? 'up' : data.changes.commits < 0 ? 'down' : 'neutral',
          },
          {
            label: 'Time Spent',
            value: `${Math.round(data.stats.time / 60)}h`,
            change: data.changes.time,
            trend: data.changes.time > 0 ? 'up' : data.changes.time < 0 ? 'down' : 'neutral',
          },
          {
            label: 'Points',
            value: data.stats.points,
            change: 0,
            trend: 'neutral',
          },
        ];

        if (isMounted) {
          setStats(mapped);
        }
      } catch (error) {
        console.error('Failed to load overview stats:', error);
        if (isMounted) {
          setStats([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>;
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {stats.map((stat, idx) => (
        <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">{stat.label}</span>
            <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-green-600' :
                stat.trend === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}
            >
              {stat.change !== 0 && `${stat.change > 0 ? '+' : ''}${stat.change}%`}
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
        </div>
      ))}
    </div>
  );
};

export default OverviewStats;
