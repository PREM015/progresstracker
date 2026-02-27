'use client';

import { useTracker } from '@/hooks/useTracker';
import { cn } from '@/lib/utils';
import React, { useState } from 'react';
// @ts-ignore
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { Tooltip } from 'react-tooltip';
import { subDays, parseISO, format } from 'date-fns';
import { EmptyState } from '@/components/common/EmptyState';
import { Calendar } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TrackerHeatmapProps {
  className?: string;
}

export const TrackerHeatmap: React.FC<TrackerHeatmapProps> = ({
  className = '',
}) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const { heatmap, isLoadingHeatmap } = useTracker({ year: selectedYear });

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const startDate = new Date(selectedYear, 0, 1);
  const endDate = new Date(selectedYear, 11, 31);

  if (isLoadingHeatmap) {
    return (
      <div className={cn("glass-card p-8 flex flex-col gap-6 animate-pulse", className)}>
        <div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
        <div className="h-48 w-full bg-zinc-100 dark:bg-zinc-700 rounded-xl" />
      </div>
    );
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
    <div className={cn("glass-card p-8 flex flex-col gap-6", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tighter">Consistency Flow</h3>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-1">Activity Density</p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={selectedYear.toString()}
            onValueChange={(val) => setSelectedYear(parseInt(val))}
          >
            <SelectTrigger className="w-[120px] bg-zinc-100 dark:bg-zinc-800/50 border-none font-black text-[10px] uppercase tracking-widest h-9 rounded-full">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-zinc-200 dark:border-zinc-800">
              {years.map(y => (
                <SelectItem key={y} value={y.toString()} className="font-bold text-[10px] uppercase tracking-widest">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-zinc-100 dark:bg-zinc-800/50 rounded-full">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">
              {selectedYear === currentYear ? 'Current Year' : `${selectedYear} Archive`}
            </span>
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto scrollbar-hide">
        <div className="min-w-[800px] py-4">
          <CalendarHeatmap
            startDate={startDate}
            endDate={endDate}
            values={values}
            classForValue={getClassForValue}
            tooltipDataAttrs={(value: any) => {
              if (!value || !value.date) return {};
              return {
                'data-tooltip-id': 'heatmap-tooltip',
                'data-tooltip-content': `${format(parseISO(value.date), 'MMMM d, yyyy')}: ${value.count} contributions`,
              };
            }}
            showWeekdayLabels
          />
          <Tooltip
            id="heatmap-tooltip"
            style={{
              backgroundColor: '#18181b',
              color: '#fff',
              borderRadius: '12px',
              padding: '10px 16px',
              fontSize: '11px',
              fontWeight: 700,
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              zIndex: 50
            }}
          />
        </div>
      </div>

      {values.length === 0 && (
        <EmptyState
          title="Field is Empty"
          description={`No activity recorded for the year ${selectedYear}.`}
          icon={Calendar}
          className="pb-4"
        />
      )}

      {/* Legend */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/50">
        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mr-2">Intensity</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-zinc-100 dark:bg-zinc-800" />
          <div className="w-3 h-3 rounded-sm bg-emerald-500/20" />
          <div className="w-3 h-3 rounded-sm bg-emerald-500/40" />
          <div className="w-3 h-3 rounded-sm bg-emerald-500/70" />
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
        </div>
      </div>
    </div>
  );
};

export default TrackerHeatmap;
