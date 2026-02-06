'use client';

import React, { useState, useEffect } from 'react';

interface ActivityDataPoint {
  date: string;
  problems?: number;
  commits?: number;
  time?: number;
  value?: number;
}

interface ActivityChartProps {
  className?: string;
  timeRange?: 'week' | 'month' | 'year';
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface TrendsResponse {
  data: ActivityDataPoint[];
}

export const ActivityChart: React.FC<ActivityChartProps> = ({
  className = '',
  timeRange = 'month',
}) => {
  const [data, setData] = useState<ActivityDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'problems' | 'commits' | 'time'>('problems');

  useEffect(() => {
    let isMounted = true;

    const days = timeRange === 'week' ? 7 : timeRange === 'year' ? 365 : 30;

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/analytics/trends?days=${days}&metric=all&groupBy=day`);
        const json = (await res.json()) as ApiSuccess<TrendsResponse>;

        if (!res.ok || !json?.success) {
          throw new Error('Failed to fetch activity data');
        }

        const points = Array.isArray(json.data?.data) ? json.data.data : [];
        if (isMounted) {
          setData(points);
        }
      } catch (error) {
        console.error('Failed to fetch activity data:', error);
        if (isMounted) {
          setData([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [timeRange]);

  if (loading) {
    return <div className="h-80 bg-gray-100 rounded-xl animate-pulse" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Activity Chart</h3>
        <div className="h-64 flex flex-col items-center justify-center text-gray-500">
          <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            NA
          </div>
          <p className="text-lg font-medium">No activity data yet</p>
          <p className="text-sm mt-2">Start tracking your progress to see your activity chart</p>
        </div>
      </div>
    );
  }

  const metricValue = (point: ActivityDataPoint) => {
    if (selectedMetric === 'problems') return point.problems || 0;
    if (selectedMetric === 'commits') return point.commits || 0;
    return point.time || 0;
  };

  const maxValue = Math.max(...data.map(metricValue), 1);

  const totals = data.reduce(
    (acc, point) => {
      acc.problems += point.problems || 0;
      acc.commits += point.commits || 0;
      acc.time += point.time || 0;
      return acc;
    },
    { problems: 0, commits: 0, time: 0 }
  );

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Activity Chart</h3>
        <div className="flex gap-2">
          {(['problems', 'commits', 'time'] as const).map((metric) => (
            <button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={`px-3 py-1 rounded-lg text-sm ${selectedMetric === metric
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {metric.charAt(0).toUpperCase() + metric.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-64">
        <svg viewBox="0 0 800 240" className="w-full h-full">
          {[0, 25, 50, 75, 100].map((percentage) => (
            <g key={percentage}>
              <line
                x1="0"
                y1={240 - (percentage / 100) * 220}
                x2="800"
                y2={240 - (percentage / 100) * 220}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x="-5"
                y={244 - (percentage / 100) * 220}
                fill="#9ca3af"
                fontSize="10"
                textAnchor="end"
              >
                {Math.round((maxValue * percentage) / 100)}
              </text>
            </g>
          ))}

          {data.map((point, idx) => {
            const barWidth = 800 / data.length - 10;
            const x = (idx / data.length) * 800 + 5;
            const value = metricValue(point);
            const height = (value / maxValue) * 220;
            const y = 240 - height;

            return (
              <g key={idx}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={height}
                  fill="#6366f1"
                  rx="4"
                  className="hover:fill-indigo-700 transition-colors cursor-pointer"
                />
                <text
                  x={x + barWidth / 2}
                  y={245}
                  fill="#6b7280"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {new Date(point.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{totals.problems}</div>
          <div className="text-xs text-gray-600">Total Problems</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{totals.commits}</div>
          <div className="text-xs text-gray-600">Total Commits</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{totals.time}</div>
          <div className="text-xs text-gray-600">Total Time</div>
        </div>
      </div>
    </div>
  );
};

export default ActivityChart;
