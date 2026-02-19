'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/common/EmptyState';
import { PieChart, Activity } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';

interface DifficultyData {
    easy: number;
    medium: number;
    hard: number;
}

interface DifficultyDistributionProps {
    data?: DifficultyData;
    className?: string;
}

export function DifficultyDistribution({ data, className }: DifficultyDistributionProps) {
    const hasData = data && (data.easy > 0 || data.medium > 0 || data.hard > 0);
    const total = data ? data.easy + data.medium + data.hard : 0;

    const chartData = hasData ? [
        { name: 'Easy', value: data?.easy || 0, color: '#10B981' }, // emerald-500
        { name: 'Medium', value: data?.medium || 0, color: '#F59E0B' }, // amber-500
        { name: 'Hard', value: data?.hard || 0, color: '#EF4444' }, // red-500
    ].filter(d => d.value > 0) : [];

    return (
        <Card className={cn("h-full border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm", className)}>
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-50 flex items-center justify-between">
                    <span>Difficulty Breakdown</span>
                    {hasData && <span className="text-xs font-normal text-zinc-500">Total: {total}</span>}
                </CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">
                    Problems solved by difficulty.
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[250px] pb-6">
                {!hasData ? (
                    <EmptyState
                        title="No data available"
                        description="Solve problems to see difficulty split."
                        variant="small"
                        icon={PieChart}
                    />
                ) : (
                    <div className="flex flex-col h-full bg-red">
                        <div className="flex-1 w-full min-h-[160px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPie width={200} height={200}>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(24, 24, 27, 0.95)',
                                            borderColor: '#27272a',
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            color: '#fafafa',
                                            fontSize: '12px'
                                        }}
                                        itemStyle={{ color: '#fafafa' }}
                                        formatter={(value: number | undefined) => [`${value || 0} Solved`, '']}
                                    />
                                </RechartsPie>
                            </ResponsiveContainer>
                        </div>

                        <div className="flex justify-center gap-4 mt-2">
                            {chartData.map((item) => (
                                <div key={item.name} className="flex flex-col items-center">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
