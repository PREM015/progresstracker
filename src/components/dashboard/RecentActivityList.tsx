
import { CheckCircle2, Code, FileText, Trophy, Activity, GitCommit, ListTodo, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface ActivityItem {
    id: string;
    type: 'solve' | 'achievement' | 'goal' | 'post';
    title: string;
    description: string;
    timestamp: Date;
    platform?: string;
    points?: number;
}

interface RecentActivityListProps {
    activities?: ActivityItem[];
    className?: string;
}

const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
        case 'solve':
            return <Code className="h-4 w-4 text-indigo-400" />;
        case 'achievement':
            return <Trophy className="h-4 w-4 text-amber-400" />;
        case 'goal':
            return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
        case 'post':
            return <FileText className="h-4 w-4 text-zinc-400" />;
        default:
            return <Activity className="h-4 w-4 text-zinc-500" />;
    }
};

export function RecentActivityList({ activities = [], className }: RecentActivityListProps) {
    const hasActivities = activities.length > 0;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className={cn("h-full", className)}
        >
            <div className="glass-card h-full p-8 relative overflow-hidden flex flex-col border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-all duration-300 shadow-2xl">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                            Timeline <ListTodo className="w-4 h-4 text-primary" />
                        </h2>
                        <p className="text-zinc-600 dark:text-zinc-500 font-bold text-xs uppercase tracking-widest mt-1">Your latest milestones</p>
                    </div>
                    {hasActivities && (
                        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                            <Zap className="w-4 h-4 text-primary animate-pulse" />
                        </div>
                    )}
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                    {!hasActivities ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 glass rounded-3xl border-black/5 dark:border-white/5 py-12">
                            <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-black/5 dark:border-white/5 flex items-center justify-center mb-2 shadow-2xl">
                                <Activity className="w-8 h-8 text-zinc-400 dark:text-zinc-700" />
                            </div>
                            <div className="text-center">
                                <p className="text-zinc-900 dark:text-white font-bold text-lg">Silent Timeline</p>
                                <p className="text-zinc-600 dark:text-zinc-500 font-medium text-sm">Activities will appear here as you progress.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 -mx-4 px-4 overflow-y-auto mix-blend-normal relative z-10">
                            <div className="space-y-4 pb-4">
                                {activities.map((item, idx) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.6 + (idx * 0.05) }}
                                        className="group relative flex gap-4 p-4 rounded-2xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-transparent hover:border-black/10 dark:hover:border-white/10 transition-all duration-300 backdrop-blur-sm"
                                    >
                                        <div className="mt-1 flex-shrink-0">
                                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                                                {getIcon(item.type)}
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-1 min-w-0">
                                            <div className="flex items-center justify-between gap-4">
                                                <p className="text-sm font-black text-zinc-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                                    {item.title}
                                                </p>
                                                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-wider whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed line-clamp-2">
                                                {item.description}
                                            </p>

                                            <div className="flex items-center gap-3 mt-3">
                                                {item.platform && (
                                                    <span className="flex items-center gap-1.5 text-[9px] px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-black/5 dark:border-white/5 text-zinc-600 dark:text-zinc-300 font-black uppercase tracking-[0.1em]">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                        {item.platform}
                                                    </span>
                                                )}
                                                {typeof item.points === 'number' && item.points > 0 && (
                                                    <span className="text-[9px] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-black uppercase tracking-[0.1em]">
                                                        +{item.points} PTS
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

