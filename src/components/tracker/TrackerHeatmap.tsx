'use client';

import React, { useState, useEffect } from 'react';

interface HeatmapData {
  date: string;
  count: number;
}

interface TrackerHeatmapProps {
  className?: string;
}

export const TrackerHeatmap: React.FC<TrackerHeatmapProps> = ({
  className = '',
}) => {
  const [data, setData] = useState<HeatmapData[]>([]);

  useEffect(() => {
    fetch('/api/tracker/heatmap')
      .then(r => r.json())
      .then(data => setData(data));
  }, []);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-gray-100';
    if (count < 3) return 'bg-green-200';
    if (count < 6) return 'bg-green-400';
    if (count < 10) return 'bg-green-600';
    return 'bg-green-800';
  };

  const weeks = [];
  for (let w = 0; w < 12; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date();
      date.setDate(date.getDate() - (11 - w) * 7 - (6 - d));
      const dateStr = date.toISOString().split('T')[0];
      const dayData = data.find(d => d.date === dateStr);
      days.push({ date: dateStr, count: dayData?.count || 0 });
    }
    weeks.push(days);
  }

  return (
    <div className={`bg-white border rounded-xl p-6 ${className}`}>
      <h3 className="text-lg font-bold mb-4">Activity Heatmap</h3>
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => (
              <div
                key={di}
                className={`w-3 h-3 rounded-sm ${getColor(day.count)}`}
                title={`${day.date}: ${day.count}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrackerHeatmap;
