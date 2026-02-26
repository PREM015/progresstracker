import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Calendar, Info, TrendingUp } from 'lucide-react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { Tooltip } from 'react-tooltip';

interface ActivityHeatmapProps {
    activityData: Record<string, number>;
    className?: string;
}

export function ActivityHeatmap({ activityData = {}, className }: ActivityHeatmapProps) {
    const heatmapValues = Object.entries(activityData).map(([date, count]) => ({
        date,
        count: count,
    }));

    const today = new Date();
    const startDate = new Date();
    startDate.setFullYear(today.getFullYear() - 1);

    const hasData = heatmapValues.length > 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className={cn("h-full", className)}
        >
            <div className="glass-card h-full p-8 relative overflow-hidden flex flex-col border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-all duration-300 shadow-2xl">
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                            Activity Pulse <TrendingUp className="w-4 h-4 text-primary" />
                        </h2>
                        <p className="text-zinc-600 dark:text-zinc-500 font-bold text-xs uppercase tracking-widest mt-1">Consistency over the last year</p>
                    </div>
                    <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-black/5 dark:border-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-help">
                        <Info className="w-4 h-4" />
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    {!hasData ? (
                        <div className="py-20 text-center glass rounded-3xl border-black/5 dark:border-white/5 flex flex-col items-center justify-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-black/5 dark:border-white/5 flex items-center justify-center mb-2 shadow-2xl">
                                <Calendar className="w-8 h-8 text-zinc-400 dark:text-zinc-700" />
                            </div>
                            <div>
                                <p className="text-zinc-900 dark:text-white font-bold text-lg">No Activity Detected</p>
                                <p className="text-zinc-600 dark:text-zinc-500 font-medium text-sm">Start your streak today to see your pulse!</p>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full relative px-4">
                            <CalendarHeatmap
                                startDate={startDate}
                                endDate={today}
                                values={heatmapValues}
                                classForValue={(value) => {
                                    if (!value || value.count === 0) return 'color-empty';
                                    const count = value.count;
                                    if (count >= 10) return 'color-scale-4';
                                    if (count >= 5) return 'color-scale-3';
                                    if (count >= 2) return 'color-scale-2';
                                    return 'color-scale-1';
                                }}
                                tooltipDataAttrs={(value: any) => {
                                    if (!value || !value.date) return {};
                                    const dateStr = typeof value.date === 'string' ? value.date : value.date.toISOString().split('T')[0];
                                    return {
                                        'data-tooltip-id': 'heatmap-tooltip',
                                        'data-tooltip-content': `${dateStr}: ${value.count} activities`,
                                    };
                                }}
                                showWeekdayLabels={false}
                            />
                            <Tooltip id="heatmap-tooltip" noArrow />

                            <div className="mt-8 flex items-center justify-end gap-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Less</span>
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-sm bg-zinc-200 dark:bg-zinc-800 border border-black/5 dark:border-white/5" />
                                    <div className="w-3 h-3 rounded-sm bg-primary/20" />
                                    <div className="w-3 h-3 rounded-sm bg-primary/50" />
                                    <div className="w-3 h-3 rounded-sm bg-primary/80" />
                                    <div className="w-3 h-3 rounded-sm bg-primary shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">More</span>
                            </div>
                        </div>
                    )}
                </div>

                <style jsx global>{`
          .react-calendar-heatmap { width: 100%; height: auto; }
          .react-calendar-heatmap rect { rx: 2px; ry: 2px; transition: all 0.2s; }
          .react-calendar-heatmap rect:hover { transform: scale(1.1); stroke: rgba(0,0,0,0.2); stroke-width: 1px; }
          .dark .react-calendar-heatmap rect:hover { stroke: rgba(255,255,255,0.2); }
          
          .react-calendar-heatmap .color-empty { fill: rgba(0, 0, 0, 0.05); }
          .dark .react-calendar-heatmap .color-empty { fill: rgba(255, 255, 255, 0.03); }
          
          .react-calendar-heatmap .color-scale-1 { fill: rgba(99, 102, 241, 0.2); }
          .react-calendar-heatmap .color-scale-2 { fill: rgba(99, 102, 241, 0.4); }
          .react-calendar-heatmap .color-scale-3 { fill: rgba(99, 102, 241, 0.7); }
          .react-calendar-heatmap .color-scale-4 { fill: rgb(99, 102, 241); }
          
          #heatmap-tooltip {
            background: #ffffff !important;
            border: 1px solid rgba(0,0,0,0.1) !important;
            border-radius: 12px !important;
            padding: 8px 12px !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            color: #09090b !important;
            letter-spacing: 0.05em !important;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1) !important;
          }
          
          .dark #heatmap-tooltip {
            background: #09090b !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
            color: white !important;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
          }
        `}</style>
            </div>
        </motion.div>
    );
}

