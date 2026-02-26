import { cn } from '@/lib/utils';
import { PieChart as PieChartIcon, Activity, Sparkles, Zap, Brain } from 'lucide-react';
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
        { name: 'Easy', value: data?.easy || 0, color: '#10B981', icon: Sparkles }, // emerald-500
        { name: 'Medium', value: data?.medium || 0, color: '#F59E0B', icon: Zap }, // amber-500
        { name: 'Hard', value: data?.hard || 0, color: '#EF4444', icon: Brain }, // red-500
    ].filter(d => d.value > 0) : [];

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="glass-card p-3 border-black/10 dark:border-white/10 shadow-2xl backdrop-blur-2xl bg-white/90 dark:bg-black/80">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{data.name}</span>
                    </div>
                    <div className="text-lg font-black text-zinc-900 dark:text-white">{data.value} <span className="text-[10px] text-zinc-500 font-bold uppercase">Solved</span></div>
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className={cn("h-full", className)}
        >
            <div className="glass-card h-full p-8 relative overflow-hidden flex flex-col border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-all duration-300 shadow-2xl">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                            Complexity <PieChartIcon className="w-4 h-4 text-primary" />
                        </h2>
                        <p className="text-zinc-600 dark:text-zinc-500 font-bold text-xs uppercase tracking-widest mt-1">Problem Difficulty Split</p>
                    </div>
                    {hasData && (
                        <div className="text-right">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Total</span>
                            <p className="text-xl font-black text-zinc-900 dark:text-white">{total}</p>
                        </div>
                    )}
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    {!hasData ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-4 glass rounded-3xl border-black/5 dark:border-white/5">
                            <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-black/5 dark:border-white/5 flex items-center justify-center mb-2 shadow-2xl">
                                <PieChartIcon className="w-8 h-8 text-zinc-400 dark:text-zinc-700" />
                            </div>
                            <div className="text-center">
                                <p className="text-zinc-900 dark:text-white font-bold text-lg">No Insights Yet</p>
                                <p className="text-zinc-600 dark:text-zinc-500 font-medium text-sm">Solve varied problems to see a distribution.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="flex-1 w-full min-h-[180px] relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPie>
                                        <Pie
                                            data={chartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={65}
                                            outerRadius={85}
                                            paddingAngle={8}
                                            dataKey="value"
                                            stroke="none"
                                            animationBegin={500}
                                            animationDuration={1500}
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={entry.color}
                                                    style={{ filter: `drop-shadow(0 0 10px ${entry.color}44)` }}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </RechartsPie>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <Activity className="w-6 h-6 text-zinc-800" />
                                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-700 mt-1">Status</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mt-8">
                                {chartData.map((item, idx) => {
                                    const Icon = item.icon;
                                    return (
                                        <motion.div
                                            key={item.name}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.8 + (idx * 0.1) }}
                                            className="bg-zinc-100 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 rounded-2xl p-3 flex flex-col items-center gap-1 group hover:border-black/10 dark:hover:border-white/10 transition-colors"
                                        >
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Icon className="w-3 h-3" style={{ color: item.color }} />
                                                <span className="text-[9px] text-zinc-500 font-black uppercase tracking-wider">{item.name}</span>
                                            </div>
                                            <span className="text-lg font-black text-zinc-900 dark:text-white">{item.value}</span>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

