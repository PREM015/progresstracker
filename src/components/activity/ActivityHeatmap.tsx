
'use client';

import React, { useEffect, useState } from 'react';
import { ActivityService, ActivityStats } from '@/services/api/activity.service';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Flame, Timer } from 'lucide-react';
import { format, eachDayOfInterval, subDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns';

interface ActivityHeatmapProps {
    refreshTrigger?: number;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ refreshTrigger = 0 }) => {
    const [stats, setStats] = useState<ActivityStats | null>(null);

    useEffect(() => {
        ActivityService.getStats().then(setStats).catch(console.error);
    }, [refreshTrigger]);

    if (!stats) return <div className="h-32 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl animate-pulse" />;

    // Generate calendar grid for last 3 months ~ 90 days, tailored to fit typical container
    // For simplicity, let's show last 16 weeks ~ 4 months
    const today = new Date();
    const startDate = startOfWeek(subDays(today, 16 * 7)); // 16 weeks ago
    const endDate = endOfWeek(today); // Today's week end

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Group by week
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];

    days.forEach(day => {
        currentWeek.push(day);
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    });

    const getColor = (count: number) => {
        if (count === 0) return "bg-zinc-100 dark:bg-zinc-900";
        if (count <= 1) return "bg-emerald-200 dark:bg-emerald-900/60";
        if (count <= 3) return "bg-emerald-300 dark:bg-emerald-800/80";
        if (count <= 5) return "bg-emerald-400 dark:bg-emerald-600";
        return "bg-emerald-500 dark:bg-emerald-500";
    };

    return (
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    Activity History
                </h3>

                <div className="flex gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded-md">
                            <Flame className="w-4 h-4 text-orange-500" />
                        </div>
                        <div>
                            <span className="block font-bold text-zinc-900 dark:text-zinc-50">{stats.currentStreak} day streak</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                            <Timer className="w-4 h-4 text-blue-500" />
                        </div>
                        <div>
                            <span className="block font-bold text-zinc-900 dark:text-zinc-50">{Math.round(stats.totalTime / 60)} hrs total</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto pb-2">
                <div className="flex gap-1 min-w-max">
                    {weeks.map((week, weekIdx) => (
                        <div key={weekIdx} className="flex flex-col gap-1">
                            {week.map((day, dayIdx) => {
                                const dateStr = format(day, "yyyy-MM-dd");
                                const data = stats.heatmap[dateStr];
                                const count = data?.count || 0;
                                const time = data?.time || 0;

                                return (
                                    <TooltipProvider key={dateStr}>
                                        <Tooltip delayDuration={0}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className={cn(
                                                        "w-3 h-3 rounded-[2px] transition-colors",
                                                        getColor(count)
                                                    )}
                                                />
                                            </TooltipTrigger>
                                            <TooltipContent className="text-xs">
                                                <div className="font-bold">{format(day, "MMM do, yyyy")}</div>
                                                <div>{count} activities</div>
                                                <div>{time} min logged</div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 text-xs text-zinc-400">
                <span>Less</span>
                <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-zinc-100 dark:bg-zinc-900" />
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-200 dark:bg-emerald-900/60" />
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-300 dark:bg-emerald-800/80" />
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400 dark:bg-emerald-600" />
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500 dark:bg-emerald-500" />
                </div>
                <span>More</span>
            </div>
        </div>
    );
};
