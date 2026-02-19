'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PlatformStat {
    platform: string;
    count: number;
    color?: string;
}

interface PlatformBreakdownProps {
    data?: PlatformStat[];
    className?: string;
}

// Professional, distinct colors for platforms
const defaultColors = [
    'bg-indigo-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-sky-500'
];

export function PlatformBreakdown({ data = [], className }: PlatformBreakdownProps) {
    const max = Math.max(...data.map(d => d.count), 1);

    return (
        <Card className={cn("border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm", className)}>
            <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Platform Activity</CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">
                    Distribution of your problem solving.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <EmptyState
                        title="No data available"
                        description="Solve problems to see breakdown"
                        variant="small"
                        icon={BarChart3}
                    />
                ) : (
                    <div className="space-y-4">
                        {data.map((item, index) => (
                            <div key={item.platform} className="space-y-1.5 group">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{item.platform}</span>
                                    <span className="text-zinc-500 dark:text-zinc-400 font-mono">{item.count}</span>
                                </div>
                                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(item.count / max) * 100}%` }}
                                        transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.1 }}
                                        className={cn(
                                            "h-full rounded-full transition-all duration-300",
                                            item.color || defaultColors[index % defaultColors.length]
                                        )}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
