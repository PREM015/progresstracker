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
    return <div className="h-80 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl animate-pulse" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className={`glass-card bg-white dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 rounded-xl p-6 ${className}`}>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">Activity Chart</h3>
        <div className="h-64 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
          <div className="w-16 h-16 mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
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
    <div className={`glass-card bg-white dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Activity Chart</h3>
        <div className="flex gap-2">
          {(['problems', 'commits', 'time'] as const).map((metric) => (
            <button
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={`px-3 py-1 rounded-lg text-sm font-bold transition-all ${selectedMetric === metric
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
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
                fill="currentColor"
                className="text-zinc-400 dark:text-zinc-500"
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
                  fill="currentColor"
                  className="text-zinc-500 dark:text-zinc-400"
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

      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-black/5 dark:border-white/5">
        <div className="text-center">
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">{totals.problems}</div>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-500">Total Problems</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">{totals.commits}</div>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-500">Total Commits</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">{totals.time}</div>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-500">Total Time</div>
        </div>
      </div>
    </div>
  );
};

export default ActivityChart;
