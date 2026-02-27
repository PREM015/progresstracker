'use client';

import { useMemo } from 'react';
import { useTracker } from '@/hooks/useTracker';
import type { TrackerEntry } from '@/types/tracker';
import { getActivitySummary } from '@/types/tracker';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TrackerRecentActivityProps {
    userId?: string;
    limit?: number;
    onEntryClick?: (entry: TrackerEntry) => void;
    className?: string;
}

import { EmptyState } from '@/components/common/EmptyState';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, Activity } from 'lucide-react';
import Link from 'next/link';

export function TrackerRecentActivity({
    userId,
    limit = 10,
    onEntryClick,
    className = ''
}: TrackerRecentActivityProps) {
    const filters = useMemo(() => ({ limit, page: 1 }), [limit]);
    const { entries, isLoading: loading, error } = useTracker(filters);

    const getRelativeTime = (date: Date): string => {
        const now = new Date();
        const diff = now.getTime() - new Date(date).getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    };

    if (loading) {
        return (
            <div className={`space-y-3 ${className}`}>
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-20 bg-gray-100/10 rounded-xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bg-red-500/10 border border-red-500/20 rounded-xl p-4 ${className}`}>
                <p className="text-red-400 text-sm">Failed to load recent activity</p>
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className={`py-8 ${className}`}>
                <EmptyState
                    title="No recent activity"
                    description="Your recent problems and sessions will appear here."
                    icon={Activity}
                    action={
                        <Button variant="outline" asChild size="sm">
                            <Link href="/tracker/new">Log your first problem</Link>
                        </Button>
                    }
                />
            </div>
        );
    }

    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Recent History</h3>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Live Delta</span>
            </div>

            <div className="space-y-3">
                {entries.map((entry) => {
                    if (!entry) return null;
                    const platformName = entry.platform?.name || 'Local Sync';

                    return (
                        <div
                            key={entry.id}
                            onClick={() => onEntryClick?.(entry)}
                            className={cn(
                                "group relative flex items-center gap-4 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/20 hover:border-indigo-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-all duration-300",
                                onEntryClick && "cursor-pointer"
                            )}
                        >
                            <div className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl text-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 group-hover:scale-110 transition-transform duration-300 shadow-sm font-bold">
                                {entry.platform?.icon ? <img src={entry.platform.icon} className="w-6 h-6 object-contain" alt="" /> : (entry.platform?.name.charAt(0) || '📝')}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-zinc-900 dark:text-zinc-50 text-sm truncate tracking-tight">{platformName}</span>
                                    <div className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 whitespace-nowrap">
                                        {format(new Date(entry.date), 'MMM d')}
                                    </span>
                                </div>
                                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate mt-0.5 tracking-tight capitalize">
                                    {entry.category?.toLowerCase() || getActivitySummary(entry)}
                                </p>
                            </div>

                            <div className="shrink-0 flex flex-col items-end gap-1">
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                                    {getRelativeTime(new Date(entry.createdAt))}
                                </span>
                                {entry.problemsSolved > 0 && (
                                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md uppercase">
                                        +{entry.problemsSolved} pts
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {entries.length >= limit && (
                <Button
                    variant="ghost"
                    asChild
                    className="w-full mt-4 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-indigo-500/10 font-bold text-xs uppercase tracking-widest h-12"
                >
                    <Link href="/tracker" className="flex items-center justify-center gap-2">
                        Inspect All Activity <ArrowRight className="w-4 h-4" />
                    </Link>
                </Button>
            )}
        </div>
    );
}

export default TrackerRecentActivity;
