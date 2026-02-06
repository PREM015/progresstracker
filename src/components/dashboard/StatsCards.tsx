'use client';

import React, { useEffect, useMemo, useState } from 'react';

interface StatsCard {
  id: string;
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'flat';
}

interface StatsCardsProps {
  className?: string;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface DashboardWidget {
  id: string;
  title: string;
  value: string | number;
  change: number;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ className = '' }) => {
  const [stats, setStats] = useState<StatsCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const res = await fetch('/api/dashboard/overview');
        const json = (await res.json()) as ApiSuccess<DashboardWidget[]>;
        if (!res.ok || !json?.success) {
          throw new Error('Failed to fetch dashboard stats');
        }

        const mapped = (json.data || []).map((item) => ({
          id: item.id,
          label: item.title,
          value: item.value,
          change: Number(item.change) || 0,
          trend: item.change > 0 ? 'up' : item.change < 0 ? 'down' : 'flat',
        }));

        if (isMounted) {
          setStats(mapped);
        }
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
        if (isMounted) {
          setStats([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const initials = useMemo(() => {
    const map: Record<string, string> = {};
    stats.forEach((stat) => {
      const parts = stat.label.split(' ').filter(Boolean);
      map[stat.id] = parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : (parts[0]?.slice(0, 2).toUpperCase() || 'ST');
    });
    return map;
  }, [stats]);

  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
        {[0, 1, 2, 3].map((idx) => (
          <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
            <div className="h-10 w-10 bg-gray-100 rounded-lg mb-4" />
            <div className="h-6 bg-gray-100 rounded w-2/3 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats.length) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
        <div className="text-sm text-gray-600">No stats available yet.</div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {stats.map((stat) => (
        <div key={stat.id} className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center text-sm font-semibold">
              {initials[stat.id] || 'ST'}
            </div>
            {stat.change !== 0 && (
              <span className={`text-sm font-bold ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {stat.trend === 'up' ? 'UP' : 'DOWN'} {Math.abs(stat.change)}%
              </span>
            )}
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
          </div>
          <div className="text-sm text-gray-600">{stat.label}</div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
