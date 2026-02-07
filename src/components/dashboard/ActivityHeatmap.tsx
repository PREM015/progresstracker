'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format, eachDayOfInterval, subDays } from 'date-fns';

interface ActivityHeatmapProps {
    activityData?: Record<string, number>;
}

const getIntensityClass = (count: number) => {
    if (count === 0) return 'bg-secondary';
    if (count === 1) return 'bg-emerald-200 dark:bg-emerald-900';
    if (count === 2) return 'bg-emerald-300 dark:bg-emerald-700';
    if (count === 3) return 'bg-emerald-400 dark:bg-emerald-500';
    return 'bg-emerald-500 dark:bg-emerald-300';
};

export function ActivityHeatmap({ activityData = {} }: ActivityHeatmapProps) {
    const today = new Date();
    // We'll render a fixed number that wraps nice or use a scroll area.
    // 140 days ~ 20 weeks
    const daysToRender = 140;
    const startDate = subDays(today, daysToRender);
    const dates = eachDayOfInterval({ start: startDate, end: today });

    return (
        <Card className="col-span-4 lg:col-span-2 w-full">
            <CardHeader>
                <CardTitle>Activity</CardTitle>
                <CardDescription>Daily problem solving activity</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-1 justify-center md:justify-start">
                        <TooltipProvider>
                            {dates.map((date) => {
                                const dateString = format(date, 'yyyy-MM-dd');
                                const count = activityData[dateString] || 0;
                                return (
                                    <Tooltip key={dateString} delayDuration={50}>
                                        <TooltipTrigger asChild>
                                            <div
                                                className={cn(
                                                    "w-3 h-3 rounded-[2px] transition-colors",
                                                    getIntensityClass(count)
                                                )}
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="text-xs">
                                                {count} problems on {format(date, 'MMM d, yyyy')}
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            })}
                        </TooltipProvider>
                    </div>
                    <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground mt-2">
                        <span>Less</span>
                        <div className="flex gap-1">
                            <div className="w-3 h-3 rounded-[2px] bg-secondary" />
                            <div className="w-3 h-3 rounded-[2px] bg-emerald-200 dark:bg-emerald-900" />
                            <div className="w-3 h-3 rounded-[2px] bg-emerald-300 dark:bg-emerald-700" />
                            <div className="w-3 h-3 rounded-[2px] bg-emerald-400 dark:bg-emerald-500" />
                            <div className="w-3 h-3 rounded-[2px] bg-emerald-500 dark:bg-emerald-300" />
                        </div>
                        <span>More</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
