'use client';

import React, { useState, useEffect } from 'react';

interface HeatmapData {
  date: string;
  count: number;
  level?: number;
}

interface HeatmapCalendarProps {
  className?: string;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface HeatmapResponse {
  data: HeatmapData[];
}

export const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({
  className = '',
}) => {
  const [data, setData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchHeatmap = async () => {
      try {
        const res = await fetch('/api/analytics/heatmap?range=3m');
        const json = (await res.json()) as ApiSuccess<HeatmapResponse>;
        if (!res.ok || !json?.success) {
          throw new Error('Failed to fetch heatmap data');
        }

        const points = Array.isArray(json.data?.data) ? json.data.data : [];
        if (isMounted) {
          setData(points);
        }
      } catch (error) {
        console.error('Failed to load heatmap data:', error);
        if (isMounted) {
          setData([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchHeatmap();

    return () => {
      isMounted = false;
    };
  }, []);

  const getIntensity = (count: number) => {
    if (count === 0) return 'bg-gray-100';
    if (count < 3) return 'bg-green-200';
    if (count < 6) return 'bg-green-400';
    if (count < 10) return 'bg-green-600';
    return 'bg-green-800';
  };

  if (loading) return <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />;

  const weeks: HeatmapData[][] = [];
  for (let week = 0; week < 12; week++) {
    const days: HeatmapData[] = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date();
      date.setDate(date.getDate() - (11 - week) * 7 - (6 - day));
      const dateStr = date.toISOString().split('T')[0];
      const dayData = data.find(d => d.date === dateStr);
      days.push({ date: dateStr, count: dayData?.count || 0 });
    }
    weeks.push(days);
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <h3 className="text-xl font-bold text-gray-900 mb-6">Activity Heatmap</h3>

      <div className="flex gap-1">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-1">
            {week.map((day, dayIdx) => (
              <div
                key={dayIdx}
                className={`w-3 h-3 rounded-sm ${getIntensity(day.count)}`}
                title={`${day.date}: ${day.count} activities`}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-600">
        <span>Less</span>
        {[0, 3, 6, 10, 15].map((count, idx) => (
          <div key={idx} className={`w-3 h-3 rounded-sm ${getIntensity(count)}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
};

export default HeatmapCalendar;
