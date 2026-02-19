'use client';

import { Activity, Flame, Trophy, Target, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface StatsProps {
    totalSolved: number;
    streak: number;
    monthlyGoalProgress: number;
    totalPoints: number;
    totalSolvedTrend?: number;
    pointsTrend?: number;
    streakLongest?: number;
}

export function OverviewStats({
    totalSolved = 0,
    streak = 0,
    monthlyGoalProgress = 0,
    totalPoints = 0,
    totalSolvedTrend,
    pointsTrend,
    streakLongest
}: Partial<StatsProps>) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
                title="Total Solved"
                value={totalSolved}
                icon={Activity}
                trend={totalSolvedTrend ? `${totalSolvedTrend > 0 ? '+' : ''}${totalSolvedTrend}% vs last month` : undefined}
                trendUp={totalSolvedTrend ? totalSolvedTrend >= 0 : undefined}
                delay={0}
            />
            <StatsCard
                title="Current Streak"
                value={streak}
                icon={Flame}
                subtitle={streakLongest ? `Longest: ${streakLongest} days` : "Days"}
                delay={0.1}
                highlight={streak > 0}
            />
            <StatsCard
                title="Monthly Goal"
                value={`${monthlyGoalProgress}%`}
                icon={Target}
                progress={monthlyGoalProgress}
                delay={0.2}
            />
            <StatsCard
                title="Total Points"
                value={totalPoints}
                icon={Trophy}
                trend={pointsTrend ? `${pointsTrend > 0 ? '+' : ''}${pointsTrend}% vs last month` : undefined}
                trendUp={pointsTrend ? pointsTrend >= 0 : undefined}
                delay={0.3}
            />
        </div>
    );
}

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: any;
    subtitle?: string;
    trend?: string;
    trendUp?: boolean;
    progress?: number;
    delay?: number;
    highlight?: boolean;
}

import { Tilt3D } from '@/components/ui/motion/Tilt3D';
import { GlowBorder } from '@/components/ui/motion/GlowBorder';

// ... existing code ...

function StatsCard({ title, value, icon: Icon, subtitle, trend, trendUp, progress, delay = 0, highlight }: StatsCardProps) {
    const CardContent = (
        <div className={cn(
            "relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all duration-200 h-full",
            highlight && "bg-indigo-50/50 dark:bg-indigo-950/10 border-indigo-200 dark:border-indigo-800/30"
        )}>
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className={cn(
                        "p-2 rounded-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                        highlight
                            ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                            : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400"
                    )}>
                        <Icon className="w-5 h-5" />
                    </div>
                    {trend && (
                        <div className={cn(
                            "flex items-center text-xs font-medium",
                            trendUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                        )}>
                            {trend}
                            {trendUp && <ArrowUpRight className="w-3 h-3 ml-0.5" />}
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
                            {value}
                        </span>
                        {subtitle && (
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                                {subtitle}
                            </span>
                        )}
                    </div>
                </div>

                {progress !== undefined && (
                    <div className="mt-4 h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, progress)}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            className="h-full group"
        >
            <Tilt3D intensity={5} className="h-full">
                {highlight ? (
                    <GlowBorder className="h-full p-px rounded-xl bg-indigo-500/20" borderRadius={12}>
                        {CardContent}
                    </GlowBorder>
                ) : (
                    CardContent
                )}
            </Tilt3D>
        </motion.div>
    );
}
