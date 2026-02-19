'use client';

import { useTracker } from '@/hooks/useTracker';
import { GlassCard } from '@/components/ui/GlassCard';
import React, { useState } from 'react';
// @ts-ignore
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { Tooltip } from 'react-tooltip';
import { subDays, parseISO, format } from 'date-fns';
import { EmptyState } from '@/components/common/EmptyState';
import { Calendar } from 'lucide-react';

interface TrackerHeatmapProps {
  className?: string;
}

export const TrackerHeatmap: React.FC<TrackerHeatmapProps> = ({
  className = '',
}) => {
  const { heatmap, isLoadingHeatmap } = useTracker();

  // Stabilize dates for hydration - MUST be before any conditional returns
  const [endDate] = useState(() => new Date());
  const [startDate] = useState(() => subDays(new Date(), 365));

  if (isLoadingHeatmap) {
    return <div className="h-48 animate-pulse bg-zinc-100 dark:bg-zinc-800 rounded-xl" />;
  }

  // Transform data for react-calendar-heatmap
  const values = heatmap.map((d: { date: string, count: number }) => ({
    date: d.date,
    count: d.count,
  }));

  const getClassForValue = (value: any) => {
    if (!value || value.count === 0) {
      return 'color-empty';
    }
    if (value.count < 3) return 'color-scale-1'; // Light green
    if (value.count < 6) return 'color-scale-2'; // Medium green
    if (value.count < 9) return 'color-scale-3'; // Dark green
    return 'color-scale-4'; // Very dark green
  };

  return (
    <GlassCard className={`p-6 ${className} flex flex-col gap-4`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Activity Heatmap</h3>
        <span className="text-sm text-zinc-400">Last 365 days</span>
      </div>

      <div className="w-full overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Styles moved to globals.css to prevent hydration mismatch */}

          <CalendarHeatmap
            startDate={startDate}
            endDate={endDate}
            values={values}
            classForValue={getClassForValue}
            tooltipDataAttrs={(value: any) => {
              if (!value || !value.date) return {};
              return {
                'data-tooltip-id': 'heatmap-tooltip',
                'data-tooltip-content': `${value.date}: ${value.count} entries`,
              };
            }}
            showWeekdayLabels
          />
          <Tooltip id="heatmap-tooltip" style={{ backgroundColor: '#18181b', color: '#fff', borderRadius: '8px' }} />
        </div>
      </div>

      {values.length === 0 && (
        <EmptyState
          title="No activity yet"
          description="Start logging problems to fill up your heatmap!"
          icon={Calendar}
          className="py-4 opacity-50"
        />
      )}
    </GlassCard>
  );
};

export default TrackerHeatmap;
