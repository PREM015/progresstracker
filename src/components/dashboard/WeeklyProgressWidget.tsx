'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Calendar, TrendingUp, TrendingDown, Target, CheckCircle2, Circle } from 'lucide-react';

interface DayProgress {
  date: string;
  dayName: string;
  problems: number;
  commits: number;
  timeSpent: number;
  completed: boolean;
  isToday: boolean;
}

interface WeeklyProgressWidgetProps {
  className?: string;
}

export function WeeklyProgressWidget({ className }: WeeklyProgressWidgetProps) {
  const [days, setDays] = useState<DayProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStats, setWeekStats] = useState({
    totalProblems: 0,
    totalCommits: 0,
    totalTime: 0,
    activeDays: 0,
    trend: 0,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchWeeklyData = async () => {
      try {
        const res = await fetch('/api/analytics/weekly');
        const json = await res.json();

        if (!res.ok || !json?.success) {
          throw new Error('Failed to fetch weekly data');
        }

        if (isMounted) {
          const apiDays = json.data?.daily || [];
          if (apiDays.length > 0) {
            const todayStr = new Date().toISOString().split('T')[0];
            const mappedDays = apiDays.map((d: any) => ({
              ...d,
              problems: d.problems || 0,
              commits: d.commits || 0,
              timeSpent: d.timeSpent || 0,
              completed: d.hasActivity || ((d.problems || 0) + (d.commits || 0)) > 0,
              isToday: d.date === todayStr,
            }));
            setDays(mappedDays);
          } else {
            setDays(generateEmptyWeek());
          }
          const incomingStats = json.data?.stats || {};
          setWeekStats({
            totalProblems: incomingStats.totalProblems || 0,
            totalCommits: incomingStats.totalCommits || 0,
            totalTime: incomingStats.totalTime || 0,
            activeDays: incomingStats.activeDays || 0,
            trend: incomingStats.trend || 0,
          });
        }
      } catch (error) {
        console.error('Failed to load weekly progress:', error);
        if (isMounted) {
          setDays(generateEmptyWeek());
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchWeeklyData();
    return () => { isMounted = false; };
  }, []);

  const generateEmptyWeek = (): DayProgress[] => {
    const days: DayProgress[] = [];
    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push({
        date: date.toISOString().split('T')[0],
        dayName: dayNames[date.getDay()],
        problems: 0,
        commits: 0,
        timeSpent: 0,
        completed: false,
        isToday: i === 0,
      });
    }
    return days;
  };

  const getIntensityColor = (day: DayProgress) => {
    const total = day.problems + day.commits;
    if (total === 0) return 'bg-zinc-100 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/30';
    if (total < 3) return 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-500/30';
    if (total < 6) return 'bg-emerald-200 dark:bg-emerald-800/40 border-emerald-300 dark:border-emerald-500/40';
    if (total < 10) return 'bg-emerald-300 dark:bg-emerald-700/50 border-emerald-400 dark:border-emerald-500/50';
    return 'bg-emerald-400 dark:bg-emerald-600/60 border-emerald-500 dark:border-emerald-400/60';
  };

  if (loading) {
    return (
      <div className={cn("glass-card p-6 animate-pulse", className)}>
        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-4" />
        <div className="flex gap-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex-1 h-20 bg-zinc-200 dark:bg-zinc-800/50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.5 }}
      className={cn("h-full", className)}
    >
      <div className="glass-card h-full p-6 relative overflow-hidden flex flex-col border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-all duration-300 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">This Week</h3>
              <p className="text-zinc-600 dark:text-zinc-500 font-bold text-[10px] uppercase tracking-widest">
                {weekStats.activeDays}/7 active days
              </p>
            </div>
          </div>

          {weekStats.trend !== 0 && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase",
              weekStats.trend > 0
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            )}>
              {weekStats.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(weekStats.trend)}% vs last week
            </div>
          )}
        </div>

        {/* Week Grid */}
        <div className="flex gap-2 mb-6">
          {days.map((day, idx) => (
            <motion.div
              key={day.date}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.05 }}
              className={cn(
                "flex-1 p-3 rounded-xl border transition-all duration-300 relative group",
                getIntensityColor(day),
                day.isToday && "ring-2 ring-primary ring-offset-2 ring-offset-black"
              )}
            >
              <div className="text-center">
                <div className={cn(
                  "text-[10px] font-black uppercase tracking-wider mb-1",
                  day.isToday ? "text-primary dark:text-primary" : "text-zinc-500 dark:text-zinc-500"
                )}>
                  {day.dayName}
                </div>
                <div className="text-xl font-black text-zinc-900 dark:text-white mb-1">
                  {day.problems + day.commits}
                </div>
                <div className="text-[8px] text-zinc-500 uppercase tracking-widest">
                  activities
                </div>
              </div>

              {/* Completion indicator */}
              <div className="absolute -top-1 -right-1">
                {day.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : day.problems + day.commits > 0 ? (
                  <Circle className="w-3 h-3 text-zinc-600" />
                ) : null}
              </div>

              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="glass-card p-2 border-black/10 dark:border-white/10 text-[10px] whitespace-nowrap bg-white/90 dark:bg-black/90">
                  <div className="text-zinc-500 dark:text-zinc-400">{day.date}</div>
                  <div className="text-zinc-900 dark:text-white font-bold">{day.problems} problems</div>
                  <div className="text-zinc-900 dark:text-white font-bold">{day.commits} commits</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3 mt-auto">
          <div className="bg-zinc-100 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 rounded-xl p-3 text-center">
            <div className="text-xl font-black text-zinc-900 dark:text-white">{weekStats.totalProblems}</div>
            <div className="text-[9px] font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-wider">Problems</div>
          </div>
          <div className="bg-zinc-100 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 rounded-xl p-3 text-center">
            <div className="text-xl font-black text-zinc-900 dark:text-white">{weekStats.totalCommits}</div>
            <div className="text-[9px] font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-wider">Commits</div>
          </div>
          <div className="bg-zinc-100 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 rounded-xl p-3 text-center">
            <div className="text-xl font-black text-zinc-900 dark:text-white">{Math.round(weekStats.totalTime / 60)}h</div>
            <div className="text-[9px] font-bold text-zinc-600 dark:text-zinc-500 uppercase tracking-wider">Time</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default WeeklyProgressWidget;