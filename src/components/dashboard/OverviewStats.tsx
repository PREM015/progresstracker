import { Activity, Flame, Trophy, Target, ArrowUpRight, TrendingUp, Sparkles } from 'lucide-react';
import { motion, useSpring, useTransform, animate } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useEffect, useRef } from 'react';

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
                title="Total Solved"
                value={totalSolved}
                icon={Activity}
                trend={totalSolvedTrend ? `${totalSolvedTrend > 0 ? '+' : ''}${totalSolvedTrend}%` : undefined}
                trendUp={totalSolvedTrend ? totalSolvedTrend >= 0 : undefined}
                delay={0}
                gradient="from-blue-500 to-indigo-600"
            />
            <StatsCard
                title="Current Streak"
                value={streak}
                icon={Flame}
                subtitle={streakLongest ? `Longest: ${streakLongest}d` : "Days"}
                delay={0.1}
                highlight={streak > 0}
                gradient="from-orange-500 to-red-600"
            />
            <StatsCard
                title="Monthly Goal"
                value={monthlyGoalProgress}
                unit="%"
                icon={Target}
                progress={monthlyGoalProgress}
                delay={0.2}
                gradient="from-emerald-500 to-teal-600"
            />
            <StatsCard
                title="Total Points"
                value={totalPoints}
                icon={Trophy}
                trend={pointsTrend ? `${pointsTrend > 0 ? '+' : ''}${pointsTrend}%` : undefined}
                trendUp={pointsTrend ? pointsTrend >= 0 : undefined}
                delay={0.3}
                gradient="from-purple-500 to-pink-600"
            />
        </div>
    );
}

interface StatsCardProps {
    title: string;
    value: number;
    unit?: string;
    icon: any;
    subtitle?: string;
    trend?: string;
    trendUp?: boolean;
    progress?: number;
    delay?: number;
    highlight?: boolean;
    gradient: string;
}

function Counter({ value, unit = "" }: { value: number, unit?: string }) {
    const nodeRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const node = nodeRef.current;
        if (!node) return;

        const controls = animate(0, value, {
            duration: 2,
            onUpdate(value) {
                node.textContent = Math.round(value).toLocaleString() + unit;
            },
            ease: "easeOut",
        });

        return () => controls.stop();
    }, [value, unit]);

    return <span ref={nodeRef}>0</span>;
}

function StatsCard({ title, value, unit, icon: Icon, subtitle, trend, trendUp, progress, delay = 0, highlight, gradient }: StatsCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, duration: 0.5 }}
            className="group"
        >
            <div className="glass-card p-6 h-full relative overflow-hidden flex flex-col justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300 border-black/5 dark:border-white/5 group-hover:border-black/10 dark:group-hover:border-white/10 shadow-2xl">
                <div className={cn("absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-5 blur-2xl rounded-full -mr-8 -mt-8 transition-opacity group-hover:opacity-10", gradient)} />

                <div className="flex justify-between items-start mb-6">
                    <div className={cn(
                        "p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 text-zinc-900 dark:text-white transition-all group-hover:scale-110 group-hover:rotate-3 shadow-xl",
                        highlight && "border-primary/30"
                    )}>
                        <div className={cn("p-0.5 rounded-lg bg-gradient-to-br", gradient)}>
                            <div className="bg-white dark:bg-zinc-900 p-2 rounded-[6px]">
                                <Icon className="w-5 h-5 text-zinc-900 dark:text-white" />
                            </div>
                        </div>
                    </div>

                    {trend && (
                        <div className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                            trendUp ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                        )}>
                            {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                            {trend}
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-zinc-500 font-bold text-xs uppercase tracking-[0.15em] mb-1">{title}</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">
                            <Counter value={value} unit={unit} />
                        </span>
                        {subtitle && (
                            <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                                {subtitle}
                            </span>
                        )}
                    </div>
                </div>

                {progress !== undefined && (
                    <div className="mt-6">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                            <span>Progress</span>
                            <span className="text-primary">{progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden border border-black/5 dark:border-white/5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, progress)}%` }}
                                transition={{ delay: delay + 0.5, duration: 1, ease: "easeOut" }}
                                className={cn("h-full rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]", gradient.includes('emerald') ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-primary')}
                            />
                        </div>
                    </div>
                )}

                {highlight && value > 0 && (
                    <div className="absolute bottom-2 right-2 text-primary opacity-20 group-hover:opacity-100 transition-opacity">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                    </div>
                )}
            </div>
        </motion.div>
    );
}

