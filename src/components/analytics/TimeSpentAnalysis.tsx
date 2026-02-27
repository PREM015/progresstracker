'use client';

import React, { useState, useEffect } from 'react';

interface TimeData {
  category: string;
  hours: number;
  percentage: number;
  color: string;
}

interface TimeSpentAnalysisProps {
  className?: string;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface TimeSpentResponse {
  summary: {
    totalTime: number;
  };
  data: Array<{
    label: string;
    time: number;
    percentage: number;
  }>;
}

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#6B7280'];

export const TimeSpentAnalysis: React.FC<TimeSpentAnalysisProps> = ({
  className = '',
}) => {
  const [timeData, setTimeData] = useState<TimeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalHours, setTotalHours] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchTime = async () => {
      try {
        const res = await fetch('/api/analytics/time-spent?groupBy=category&days=30');

        if (!res.ok) {
          throw new Error(`Failed to fetch time spent data: ${res.status}`);
        }

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Received non-JSON response from API");
        }

        const json = (await res.json()) as ApiSuccess<TimeSpentResponse>;
        if (!json?.success) throw new Error('API reported failure');

        const items = (json.data?.data || []).map((item, idx) => ({
          category: item.label,
          hours: Math.round((item.time / 60) * 10) / 10,
          percentage: item.percentage,
          color: COLORS[idx % COLORS.length],
        }));

        if (isMounted) {
          setTimeData(items);
          setTotalHours(Math.round(((json.data?.summary?.totalTime || 0) / 60) * 10) / 10);
        }
      } catch (error) {
        console.error('Failed to load time spent analysis:', error);
        if (isMounted) {
          setTimeData([]);
          setTotalHours(0);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTime();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />;
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Time Spent Analysis</h3>

      <div className="text-center mb-8 p-6 bg-indigo-50 rounded-xl">
        <div className="text-4xl font-bold text-indigo-600 mb-1">{totalHours.toFixed(1)}h</div>
        <div className="text-sm text-gray-600">Total Time Tracked</div>
      </div>

      <div className="flex justify-center mb-8">
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            {timeData.reduce((acc, item, idx) => {
              const prevPercentage = timeData.slice(0, idx).reduce((sum, i) => sum + i.percentage, 0);
              const startAngle = (prevPercentage / 100) * 360;
              const endAngle = ((prevPercentage + item.percentage) / 100) * 360;

              const start = polarToCartesian(50, 50, 40, endAngle);
              const end = polarToCartesian(50, 50, 40, startAngle);
              const largeArc = item.percentage > 50 ? 1 : 0;

              const d = [
                'M', start.x, start.y,
                'A', 40, 40, 0, largeArc, 0, end.x, end.y,
                'L', 50, 50,
                'Z'
              ].join(' ');

              return [...acc, <path key={idx} d={d} fill={item.color} />];
            }, [] as React.ReactNode[])}
          </svg>
        </div>
      </div>

      <div className="space-y-3">
        {timeData.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
              <span className="text-sm font-medium text-gray-700">{item.category}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{item.hours.toFixed(1)}h</span>
              <span className="text-sm font-bold text-gray-900">{item.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

export default TimeSpentAnalysis;
