'use client';

import React, { useState, useEffect } from 'react';

interface PlatformComparisonData {
  platform: string;
  metrics: {
    problems: number;
    time: number;
    points: number;
  };
}

interface PlatformComparisonProps {
  className?: string;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface PlatformAnalyticsResponse {
  platforms: Array<{
    name: string;
    stats: {
      problems: number;
      time: number;
      points: number;
    };
  }>;
}

export const PlatformComparison: React.FC<PlatformComparisonProps> = ({
  className = '',
}) => {
  const [data, setData] = useState<PlatformComparisonData[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<'problems' | 'time' | 'points'>('problems');

  useEffect(() => {
    let isMounted = true;

    const fetchPlatforms = async () => {
      try {
        const res = await fetch('/api/analytics/platforms?days=30&sortBy=problems');
        const json = (await res.json()) as ApiSuccess<PlatformAnalyticsResponse>;
        if (!res.ok || !json?.success) throw new Error('Failed to fetch platform analytics');

        const mapped = (json.data?.platforms || []).map((item) => ({
          platform: item.name,
          metrics: {
            problems: item.stats.problems || 0,
            time: item.stats.time || 0,
            points: item.stats.points || 0,
          },
        }));

        if (isMounted) {
          setData(mapped);
        }
      } catch (error) {
        console.error('Failed to load platform comparison:', error);
        if (isMounted) {
          setData([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPlatforms();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />;
  }

  if (!data.length) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
        <h3 className="text-xl font-bold text-gray-900">Platform Comparison</h3>
        <div className="text-sm text-gray-600 mt-4">No platform data available.</div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.metrics[metric]), 1);

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Platform Comparison</h3>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as typeof metric)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="problems">Problems Solved</option>
          <option value="time">Time Spent</option>
          <option value="points">Points</option>
        </select>
      </div>

      <div className="space-y-4">
        {data.map((item, idx) => (
          <div key={idx}>
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="font-medium text-gray-700">{item.platform}</span>
              <span className="font-bold text-gray-900">{item.metrics[metric]}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                style={{ width: `${(item.metrics[metric] / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlatformComparison;
