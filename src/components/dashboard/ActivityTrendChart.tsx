'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

interface TrendDataPoint {
    date: string;
    value: number;
    label?: string;
}

interface ActivityTrendChartProps {
    data?: TrendDataPoint[];
    className?: string;
    loading?: boolean;
}

export function ActivityTrendChart({ data = [], className, loading }: ActivityTrendChartProps) {
    const hasData = data && data.length > 0 && data.some(d => d.value > 0);

    // Filter out future dates if any, or just take the last 30 days
    // const displayData = data.slice(-30); 

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-zinc-900/95 border border-zinc-800 p-3 rounded-lg shadow-xl text-xs">
                    <p className="font-medium text-zinc-50 mb-1">{format(parseISO(label), 'MMM d, yyyy')}</p>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                        <span className="text-zinc-300">Solved:</span>
                        <span className="font-bold text-zinc-50">{payload[0].value}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className={cn("border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm", className)}>
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Activity Trend</CardTitle>
                        <CardDescription className="text-zinc-500 dark:text-zinc-400">
                            Problems solved over the last 30 days.
                        </CardDescription>
                    </div>
                    {hasData && (
                        <div className="flex items-center gap-1 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span className="font-medium">Daily</span>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="h-[250px] min-h-[250px]">
                {loading ? (
                    <div className="h-full w-full flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : !hasData ? (
                    <EmptyState
                        title="No trend data"
                        description="Start solving problems to see your trend."
                        variant="small"
                        icon={TrendingUp}
                    />
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800" />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={10}
                                tickFormatter={(str) => format(parseISO(str), 'MMM d')}
                                fontSize={11}
                                stroke="#71717a"
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                fontSize={11}
                                stroke="#71717a"
                                allowDecimals={false}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#6366f1"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
