'use client';

import React, { useState, useEffect } from 'react';

interface Analytics {
  totalProblems: number;
  totalCommits: number;
  totalTimeSpent: number;
  totalPoints: number;
  averagePerDay: number;
  mostActiveDay: string;
  topPlatform: string;
  weeklyGrowth: number;
}

interface AnalyticsDashboardProps {
  userId: string;
  timeRange?: '7d' | '30d' | '90d' | 'all';
  className?: string;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface AnalyticsResponse {
  overview: {
    totalProblems: number;
    totalCommits: number;
    totalTimeSpent: number;
    totalPoints: number;
    avgProblemsPerDay: number;
  };
  platforms?: Array<{
    platformName: string;
    problems: number;
  }> | null;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  userId,
  timeRange = '30d',
  className = '',
}) => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState(timeRange);

  useEffect(() => {
    fetchAnalytics();
  }, [userId, selectedRange]);

  const rangeToDays = (range: '7d' | '30d' | '90d' | 'all') => {
    if (range === '7d') return 7;
    if (range === '90d') return 90;
    if (range === 'all') return 365;
    return 30;
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const days = rangeToDays(selectedRange);
      const res = await fetch(`/api/analytics?days=${days}&includePlatforms=true`);
      const json = (await res.json()) as ApiSuccess<AnalyticsResponse>;
      if (!res.ok || !json?.success) throw new Error('Failed to fetch analytics');

      const overview = json.data?.overview;
      const topPlatform = json.data?.platforms?.[0]?.platformName || 'None';

      const mapped: Analytics = {
        totalProblems: overview?.totalProblems || 0,
        totalCommits: overview?.totalCommits || 0,
        totalTimeSpent: overview?.totalTimeSpent || 0,
        totalPoints: overview?.totalPoints || 0,
        averagePerDay: overview?.avgProblemsPerDay || 0,
        mostActiveDay: 'N/A',
        topPlatform,
        weeklyGrowth: 0,
      };

      setAnalytics(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <p className="text-red-600">{error || 'No analytics data available'}</p>
        <button
          onClick={fetchAnalytics}
          className="mt-3 text-sm text-red-700 hover:text-red-800 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex gap-2 mb-6">
        {(['7d', '30d', '90d', 'all'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setSelectedRange(range)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedRange === range
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {range === 'all' ? 'All Time' : `Last ${range}`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard label="Problems Solved" value={analytics.totalProblems.toLocaleString()} color="blue" />
        <StatCard label="Total Commits" value={analytics.totalCommits.toLocaleString()} color="green" />
        <StatCard label="Time Spent" value={`${Math.floor(analytics.totalTimeSpent / 60)}h`} color="purple" />
        <StatCard label="Total Points" value={analytics.totalPoints.toLocaleString()} color="yellow" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Average Per Day</div>
          <div className="text-2xl font-bold text-gray-900">
            {analytics.averagePerDay.toFixed(1)}
          </div>
          <p className="text-xs text-gray-500 mt-1">problems/day</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Top Platform</div>
          <div className="text-2xl font-bold text-gray-900">
            {analytics.topPlatform}
          </div>
          <p className="text-xs text-gray-500 mt-1">by activity</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">Weekly Growth</div>
          <div className={`text-2xl font-bold ${analytics.weeklyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {analytics.weeklyGrowth >= 0 ? '+' : ''}{analytics.weeklyGrowth}%
          </div>
          <p className="text-xs text-gray-500 mt-1">vs last week</p>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'yellow';
}

function StatCard({ label, value, color }: StatCardProps) {
  const colorMap = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    yellow: 'bg-yellow-50 border-yellow-200',
  };

  return (
    <div className={`border-2 rounded-xl p-6 ${colorMap[color]}`}>
      <div className="text-sm font-medium text-gray-700 mb-2">{label}</div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

export default AnalyticsDashboard;
