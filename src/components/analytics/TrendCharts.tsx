'use client';

import React, { useState, useEffect } from 'react';

interface TrendData {
  date: string;
  value: number;
}

interface TrendChartsProps {
  className?: string;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface TrendsResponse {
  data: Array<{ date: string; value?: number }>;
}

export const TrendCharts: React.FC<TrendChartsProps> = ({
  className = '',
}) => {
  const [data, setData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<'problems' | 'commits' | 'time' | 'points'>('problems');

  useEffect(() => {
    let isMounted = true;

    const fetchTrends = async () => {
      try {
        const res = await fetch(`/api/analytics/trends?metric=${metric}&groupBy=day&days=30`);
        const json = (await res.json()) as ApiSuccess<TrendsResponse>;
        if (!res.ok || !json?.success) throw new Error('Failed to fetch trends');

        const points = (json.data?.data || []).map((point) => ({
          date: point.date,
          value: point.value ?? 0,
        }));

        if (isMounted) {
          setData(points);
        }
      } catch (error) {
        console.error('Failed to load trends:', error);
        if (isMounted) {
          setData([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTrends();

    return () => {
      isMounted = false;
    };
  }, [metric]);

  if (loading) {
    return <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />;
  }

  if (!data.length) {
    return (
      <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
        <h3 className="text-xl font-bold text-gray-900">Trends</h3>
        <div className="text-sm text-gray-600 mt-4">No trend data available.</div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 0);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const range = Math.max(1, maxValue - minValue);

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Trends</h3>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as typeof metric)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="problems">Problems Solved</option>
          <option value="commits">Commits</option>
          <option value="time">Time Spent</option>
          <option value="points">Points</option>
        </select>
      </div>

      <div className="relative h-64">
        <svg viewBox="0 0 800 200" className="w-full h-full">
          {[0, 25, 50, 75, 100].map((percentage) => (
            <line
              key={percentage}
              x1="0"
              y1={200 - (percentage / 100) * 200}
              x2="800"
              y2={200 - (percentage / 100) * 200}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}

          <polyline
            fill="none"
            stroke="#6366f1"
            strokeWidth="3"
            points={data.map((point, idx) => {
              const x = (idx / (data.length - 1 || 1)) * 800;
              const y = 200 - ((point.value - minValue) / range) * 180;
              return `${x},${y}`;
            }).join(' ')}
          />

          {data.map((point, idx) => {
            const x = (idx / (data.length - 1 || 1)) * 800;
            const y = 200 - ((point.value - minValue) / range) * 180;
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r="4"
                fill="#6366f1"
              />
            );
          })}
        </svg>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">{maxValue}</div>
            <div className="text-xs text-gray-600">Peak</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">
              {(data.reduce((sum, d) => sum + d.value, 0) / data.length).toFixed(1)}
            </div>
            <div className="text-xs text-gray-600">Average</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">{minValue}</div>
            <div className="text-xs text-gray-600">Low</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendCharts;
