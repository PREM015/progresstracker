'use client';

import React, { useState, useEffect } from 'react';

interface TrendData {
  date: string;
  value: number;
  label: string;
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchTrends = async () => {
      try {
        const res = await fetch(`/api/analytics/trends?metric=${metric}&groupBy=day&days=30`);

        if (!res.ok) {
          throw new Error(`Failed to fetch trends: ${res.status} ${res.statusText}`);
        }

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Received non-JSON response from API");
        }

        const json = (await res.json()) as ApiSuccess<TrendsResponse>;
        if (!json?.success) throw new Error('API reported failure');

        const points = (json.data?.data || []).map((point) => ({
          date: point.date,
          label: point.label || point.date,
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
    return <div className="h-96 bg-zinc-100 dark:bg-zinc-900 rounded-xl animate-pulse" />;
  }

  if (!data.length) {
    return (
      <div className={`bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 ${className}`}>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Trends</h3>
        <div className="text-sm text-zinc-500 mt-4">No trend data available.</div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 0);
  const minValue = Math.min(...data.map(d => d.value), 0);
  const range = Math.max(1, maxValue - minValue);

  // Chart dimensions
  const chartHeight = 200;
  const chartWidth = 800;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const graphHeight = chartHeight - padding.top - padding.bottom;
  const graphWidth = chartWidth - padding.left - padding.right;

  return (
    <div className={`bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Trends</h3>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as typeof metric)}
          className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="problems">Problems Solved</option>
          <option value="commits">Commits</option>
          <option value="time">Time Spent</option>
          <option value="points">Points</option>
        </select>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
          {/* Grid Lines & Y-Axis Labels */}
          {[0, 25, 50, 75, 100].map((percentage) => {
            const y = padding.top + graphHeight - (percentage / 100) * graphHeight;
            const value = Math.round(minValue + (range * (percentage / 100)));
            return (
              <g key={percentage}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  stroke="#e4e4e7"
                  strokeWidth="1"
                  className="dark:stroke-zinc-800"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-zinc-500 dark:fill-zinc-400"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {/* X-Axis Labels (Every 5th point) */}
          {data.map((point, idx) => {
            if (idx % Math.ceil(data.length / 6) !== 0 && idx !== data.length - 1) return null;
            const x = padding.left + (idx / (data.length - 1 || 1)) * graphWidth;
            return (
              <text
                key={idx}
                x={x}
                y={chartHeight - 10}
                textAnchor="middle"
                className="text-[10px] fill-zinc-500 dark:fill-zinc-400"
              >
                {point.label}
              </text>
            );
          })}

          {/* The Line */}
          <polyline
            fill="none"
            stroke="#6366f1"
            strokeWidth="2"
            points={data.map((point, idx) => {
              const x = padding.left + (idx / (data.length - 1 || 1)) * graphWidth;
              const y = padding.top + graphHeight - ((point.value - minValue) / range) * graphHeight;
              return `${x},${y}`;
            }).join(' ')}
          />

          {/* Data Points & Interaction Area */}
          {data.map((point, idx) => {
            const x = padding.left + (idx / (data.length - 1 || 1)) * graphWidth;
            const y = padding.top + graphHeight - ((point.value - minValue) / range) * graphHeight;
            const isHovered = hoveredIndex === idx;

            return (
              <g key={idx}>
                {/* Invisible hit area for easier hovering */}
                <rect
                  x={x - (graphWidth / data.length / 2)}
                  y={padding.top}
                  width={graphWidth / data.length}
                  height={graphHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* Visible Point */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 6 : 3}
                  className={`transition-all duration-200 ${isHovered ? 'fill-indigo-600 dark:fill-indigo-400' : 'fill-white dark:fill-zinc-950 stroke-indigo-500 stroke-2'}`}
                />
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div
            className="absolute bg-zinc-900 text-white text-xs rounded px-2 py-1 pointer-events-none transform -translate-x-1/2 -translate-y-full shadow-lg z-10"
            style={{
              left: `${(padding.left + (hoveredIndex / (data.length - 1 || 1)) * graphWidth) / chartWidth * 100}%`,
              top: `${(padding.top + graphHeight - ((data[hoveredIndex].value - minValue) / range) * graphHeight) / chartHeight * 100}%`,
              marginTop: '-12px'
            }}
          >
            <div className="font-bold">{data[hoveredIndex].value}</div>
            <div className="text-zinc-400 text-[10px]">{data[hoveredIndex].label}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{maxValue}</div>
          <div className="text-xs text-zinc-500">Peak</div>
        </div>
        <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {(data.reduce((sum, d) => sum + d.value, 0) / data.length).toFixed(1)}
          </div>
          <div className="text-xs text-zinc-500">Average</div>
        </div>
        <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{minValue}</div>
          <div className="text-xs text-zinc-500">Low</div>
        </div>
      </div>
    </div>
  );
};

export default TrendCharts;
