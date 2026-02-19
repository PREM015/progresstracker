'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/common/EmptyState';
import { Calendar } from 'lucide-react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { Tooltip } from 'react-tooltip';

interface ActivityHeatmapProps {
    activityData: Record<string, number>;
    className?: string;
}

export function ActivityHeatmap({ activityData = {}, className }: ActivityHeatmapProps) {
    // Transform data for react-calendar-heatmap
    const heatmapValues = Object.entries(activityData).map(([date, count]) => ({
        date,
        count: count,
    }));

    // Calculate start and end dates (e.g., last 365 days)
    const today = new Date();
    const startDate = new Date();
    startDate.setFullYear(today.getFullYear() - 1);

    return (
        <Card className={cn("border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm", className)}>
            <CardHeader>
                <CardTitle className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Activity</CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">
                    Your contribution graph over the last year.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {heatmapValues.length === 0 ? (
                    <EmptyState
                        title="No activity recorded"
                        description="Start your streak today!"
                        variant="small"
                        icon={Calendar}
                    />
                ) : (
                    <div className="w-full overflow-x-auto">
                        <CalendarHeatmap
                            startDate={startDate}
                            endDate={today}
                            values={heatmapValues}
                            classForValue={(value) => {
                                if (!value) {
                                    return 'color-empty';
                                }
                                // Simple scale: 1-4
                                const count = value.count;
                                if (count >= 4) return 'color-scale-4';
                                if (count >= 3) return 'color-scale-3';
                                if (count >= 2) return 'color-scale-2';
                                return 'color-scale-1';
                            }}
                            tooltipDataAttrs={(value: { date: string; count: number } | null) => {
                                if (!value || !value.date) return null;
                                return {
                                    'data-tooltip-id': 'heatmap-tooltip',
                                    'data-tooltip-content': `${value.date}: ${value.count} activities`,
                                };
                            }}
                            showWeekdayLabels={true}
                        />
                        <Tooltip id="heatmap-tooltip" />
                        <style jsx global>{`
                            .react-calendar-heatmap text {
                                font-size: 10px;
                                fill: #aaa;
                            }
                            .react-calendar-heatmap .color-empty { fill: #f3f4f6; } /* zinc-100 */
                            .dark .react-calendar-heatmap .color-empty { fill: #27272a; } /* zinc-800 */

                            .react-calendar-heatmap .color-scale-1 { fill: #c7d2fe; } /* indigo-200 */
                            .react-calendar-heatmap .color-scale-2 { fill: #818cf8; } /* indigo-400 */
                            .react-calendar-heatmap .color-scale-3 { fill: #4f46e5; } /* indigo-600 */
                            .react-calendar-heatmap .color-scale-4 { fill: #312e81; } /* indigo-900 */

                            .dark .react-calendar-heatmap .color-scale-1 { fill: #312e81; } /* indigo-900 */
                            .dark .react-calendar-heatmap .color-scale-2 { fill: #4338ca; } /* indigo-700 */
                            .dark .react-calendar-heatmap .color-scale-3 { fill: #6366f1; } /* indigo-500 */
                            .dark .react-calendar-heatmap .color-scale-4 { fill: #a5b4fc; } /* indigo-300 */
                        `}</style>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
