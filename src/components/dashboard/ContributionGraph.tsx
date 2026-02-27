'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Calendar, Info, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip } from 'react-tooltip';
import { format, eachDayOfInterval, startOfYear, endOfYear, subYears, getDay, startOfWeek, addDays } from 'date-fns';

interface ContributionData {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface ContributionGraphProps {
  className?: string;
}

export function ContributionGraph({ className }: ContributionGraphProps) {
  const [data, setData] = useState<Map<string, ContributionData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [hoveredDay, setHoveredDay] = useState<ContributionData | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchContributions = async () => {
      try {
        // API accepts: range=3m|6m|1y|all, metric=problems|commits|time|activity
        const range = year === new Date().getFullYear() ? '1y' : 'all';
        const res = await fetch(`/api/analytics/heatmap?range=${range}&metric=activity`);
        const json = await res.json();

        if (res.ok && json?.success) {
          const contributions = new Map<string, ContributionData>();
          // API returns { data: { data: [{date, count, level}], summary: {...} } }
          const rawData = json.data?.data || [];

          rawData.forEach((entry: { date: string; count: number; level: number }) => {
            // Filter to only the selected year
            if (!entry.date.startsWith(String(year))) return;

            const numCount = Number(entry.count);
            let level: 0 | 1 | 2 | 3 | 4 = 0;
            if (numCount >= 10) level = 4;
            else if (numCount >= 6) level = 3;
            else if (numCount >= 3) level = 2;
            else if (numCount >= 1) level = 1;

            contributions.set(entry.date, { date: entry.date, count: numCount, level });
          });

          if (isMounted) setData(contributions);
        }
      } catch (error) {
        console.error('Failed to fetch contributions:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchContributions();
    return () => { isMounted = false; };
  }, [year]);

  const { weeks, totalContributions, longestStreak, currentStreak } = useMemo(() => {
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 0, 1));

    // Adjust start to previous Sunday
    const calendarStart = startOfWeek(yearStart);

    // Generate all days
    const allDays = eachDayOfInterval({ start: calendarStart, end: yearEnd });

    // Group into weeks
    const weeksArray: ContributionData[][] = [];
    let currentWeek: ContributionData[] = [];

    allDays.forEach((day, idx) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const contribution = data.get(dateStr) || { date: dateStr, count: 0, level: 0 as const };

      currentWeek.push(contribution);

      if (currentWeek.length === 7 || idx === allDays.length - 1) {
        weeksArray.push(currentWeek);
        currentWeek = [];
      }
    });

    // Calculate stats
    let total = 0;
    let longestStrk = 0;
    let currentStrk = 0;
    let tempStreak = 0;

    const sortedDays = Array.from(data.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedDays.forEach(day => {
      total += day.count;
      if (day.count > 0) {
        tempStreak++;
        longestStrk = Math.max(longestStrk, tempStreak);
      } else {
        tempStreak = 0;
      }
    });

    // Current streak (count backwards from today)
    let checkDate = new Date();
    while ((data.get(format(checkDate, 'yyyy-MM-dd'))?.count ?? 0) > 0) {
      currentStrk++;
      checkDate = addDays(checkDate, -1);
    }

    return {
      weeks: weeksArray,
      totalContributions: total,
      longestStreak: longestStrk,
      currentStreak: currentStrk,
    };
  }, [data, year]);

  const levelColors = [
    'bg-zinc-100 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/30', // level 0
    'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800/40', // level 1
    'bg-emerald-300 dark:bg-emerald-700/50 border-emerald-400 dark:border-emerald-600/50', // level 2
    'bg-emerald-400 dark:bg-emerald-600/60 border-emerald-500 dark:border-emerald-500/60', // level 3
    'bg-emerald-500 border-emerald-400', // level 4
  ];

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className={cn("glass-card p-6 animate-pulse", className)}>
        <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-6" />
        <div className="h-32 bg-zinc-200 dark:bg-zinc-800/50 rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5 }}
      className={cn("h-full", className)}
    >
      <div className="glass-card h-full p-6 lg:p-8 relative overflow-hidden flex flex-col border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-all duration-300 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-xl">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Contribution Graph</h2>
              <p className="text-zinc-600 dark:text-zinc-500 font-bold text-xs uppercase tracking-widest mt-0.5">
                {totalContributions.toLocaleString()} contributions in {year}
              </p>
            </div>
          </div>

          {/* Year Navigation */}
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl p-1 border border-black/5 dark:border-white/5">
            <button
              onClick={() => setYear(y => y - 1)}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </button>
            <span className="text-sm font-black text-zinc-900 dark:text-white px-2">{year}</span>
            <button
              onClick={() => setYear(y => Math.min(y + 1, new Date().getFullYear()))}
              disabled={year >= new Date().getFullYear()}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-zinc-100 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 rounded-xl p-3 text-center">
            <div className="text-xl font-black text-zinc-900 dark:text-white">{totalContributions.toLocaleString()}</div>
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Total</div>
          </div>
          <div className="bg-zinc-100 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 rounded-xl p-3 text-center">
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{currentStreak}</div>
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Current Streak</div>
          </div>
          <div className="bg-zinc-100 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 rounded-xl p-3 text-center">
            <div className="text-xl font-black text-amber-600 dark:text-amber-400">{longestStreak}</div>
            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Longest Streak</div>
          </div>
        </div>

        {/* Graph */}
        <div className="flex-1 overflow-x-auto pb-2">
          <div className="inline-flex flex-col min-w-full">
            {/* Month labels */}
            <div className="flex mb-2 pl-8">
              {months.map((month, idx) => (
                <div
                  key={month}
                  className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider"
                  style={{ width: `${100 / 12}%`, minWidth: '40px' }}
                >
                  {month}
                </div>
              ))}
            </div>

            {/* Graph Grid */}
            <div className="flex gap-1">
              {/* Day labels */}
              <div className="flex flex-col gap-1 pr-2">
                {days.map((day, idx) => (
                  <div
                    key={day}
                    className="text-[8px] font-bold text-zinc-600 h-3 flex items-center justify-end uppercase tracking-wider"
                    style={{ visibility: idx % 2 === 1 ? 'visible' : 'hidden' }}
                  >
                    {day.slice(0, 2)}
                  </div>
                ))}
              </div>

              {/* Weeks */}
              <div className="flex gap-1">
                {weeks.map((week, weekIdx) => (
                  <div key={weekIdx} className="flex flex-col gap-1">
                    {week.map((day, dayIdx) => (
                      <div
                        key={`${weekIdx}-${dayIdx}`}
                        className={cn(
                          "w-3 h-3 rounded-sm border transition-all cursor-pointer hover:ring-2 hover:ring-white/20",
                          levelColors[day.level]
                        )}
                        data-tooltip-id="contribution-tooltip"
                        data-tooltip-content={`${day.date}: ${day.count} activities`}
                        onMouseEnter={() => setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Tooltip
          id="contribution-tooltip"
          className="!bg-white dark:!bg-zinc-900 !border !border-black/10 dark:!border-white/10 !rounded-xl !px-3 !py-2 !text-xs !font-bold !text-zinc-900 dark:!text-white z-50 shadow-xl"
        />

        {/* Legend */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
            <span>Less</span>
            {levelColors.map((color, idx) => (
              <div key={idx} className={cn("w-3 h-3 rounded-sm border", color)} />
            ))}
            <span>More</span>
          </div>

          <a
            href="/analytics/heatmap"
            className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 flex items-center gap-1"
          >
            View Details <ChevronRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

export default ContributionGraph;