'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle, Calendar, ChevronRight, Target } from 'lucide-react';
import { formatDistanceToNow, differenceInDays, isPast, isToday } from 'date-fns';
import Link from 'next/link';

interface Deadline {
  id: string;
  title: string;
  deadline: string;
  progress: number;
  category: string;
  type: 'goal' | 'contest' | 'application';
}

interface UpcomingDeadlinesWidgetProps {
  className?: string;
}

export function UpcomingDeadlinesWidget({ className }: UpcomingDeadlinesWidgetProps) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchDeadlines = async () => {
      try {
        const res = await fetch('/api/goals/upcoming?limit=5');
        const json = await res.json();

        if (res.ok && json?.success) {
          const mapped: Deadline[] = (json.data?.goals || []).map((g: any) => ({
            id: g.id,
            title: g.title,
            deadline: g.deadline || g.endDate,
            progress: g.progressPercentage || 0,
            category: g.category || 'OTHER',
            type: 'goal',
          }));
          if (isMounted) setDeadlines(mapped);
        }
      } catch (error) {
        console.error('Failed to fetch deadlines:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDeadlines();
    return () => { isMounted = false; };
  }, []);

  const getUrgencyStyle = (deadline: string) => {
    const date = new Date(deadline);
    const daysLeft = differenceInDays(date, new Date());

    if (isPast(date)) return {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      label: 'Overdue'
    };
    if (isToday(date)) return {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      label: 'Today'
    };
    if (daysLeft <= 3) return {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      text: 'text-orange-400',
      label: `${daysLeft}d left`
    };
    if (daysLeft <= 7) return {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      label: `${daysLeft}d left`
    };
    return {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      label: formatDistanceToNow(date, { addSuffix: true })
    };
  };

  if (loading) {
    return (
      <div className={cn("glass-card p-6 animate-pulse", className)}>
        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-zinc-200 dark:bg-zinc-800/50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.5 }}
      className={cn("h-full", className)}
    >
      <div className="glass-card h-full p-6 relative overflow-hidden flex flex-col border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-all duration-300 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">Upcoming</h3>
              <p className="text-zinc-600 dark:text-zinc-500 font-bold text-[10px] uppercase tracking-widest">
                {deadlines.length} deadline{deadlines.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <Link
            href="/goals"
            className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 flex items-center gap-1 group"
          >
            View All <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Deadlines List */}
        <div className="flex-1 space-y-3 overflow-y-auto">
          {deadlines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Calendar className="w-10 h-10 text-zinc-400 dark:text-zinc-700 mb-3" />
              <p className="text-zinc-900 dark:text-white font-bold">No Upcoming Deadlines</p>
              <p className="text-zinc-600 dark:text-zinc-500 text-sm mt-1">Set goals to track your deadlines</p>
            </div>
          ) : (
            deadlines.map((deadline, idx) => {
              const urgency = getUrgencyStyle(deadline.deadline);
              const isOverdue = isPast(new Date(deadline.deadline));

              return (
                <motion.div
                  key={deadline.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + idx * 0.05 }}
                  className={cn(
                    "group p-4 rounded-xl border transition-all hover:bg-black/[0.02] dark:hover:bg-white/[0.02]",
                    urgency.bg, urgency.border
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate">{deadline.title}</h4>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        <span className={urgency.text}>{urgency.label}</span>
                        <span>•</span>
                        <span>{deadline.progress}% done</span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 flex items-center justify-center">
                        <Target className="w-4 h-4 text-zinc-500" />
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${deadline.progress}%` }}
                      transition={{ duration: 0.5, delay: 0.5 + idx * 0.1 }}
                      className={cn(
                        "h-full rounded-full",
                        isOverdue
                          ? "bg-red-500"
                          : deadline.progress >= 75
                            ? "bg-emerald-500"
                            : "bg-primary"
                      )}
                    />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default UpcomingDeadlinesWidget;