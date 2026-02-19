'use client';

import { useMemo } from 'react';
import { useTracker } from '@/hooks/useTracker';
import type { TrackerEntry } from '@/types/tracker';
import { getActivitySummary } from '@/types/tracker';

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
        <div className={`space-y-4 ${className}`}>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">Recent Activity</h3>

            <div className="space-y-3">
                {entries.map((entry) => {
                    if (!entry) return null;
                    return (
                        <GlassCard
                            key={entry.id}
                            onClick={() => onEntryClick?.(entry)}
                            className={`flex items-center gap-3 p-3 !bg-white/5 border-white/10 hover:!bg-white/10 transition-all ${onEntryClick ? 'cursor-pointer' : ''
                                }`}
                        >
                            {/* Platform Icon */}
                            {entry.platform ? (
                                <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg text-xl bg-white/5 text-zinc-700 dark:text-zinc-300">
                                    {entry.platform.name.charAt(0)}
                                </div>
                            ) : (
                                <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg text-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                    📝
                                </div>
                            )}

                            {/* Entry Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-zinc-900 dark:text-zinc-200 text-sm truncate">
                                        {entry.platform?.name || 'Manual Activity'}
                                    </span>
                                    <span className="text-xs text-zinc-400">•</span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                    {entry.category ? entry.category.toLowerCase() : getActivitySummary(entry)}
                                </p>
                            </div>

                            {/* Time Badge */}
                            <div className="shrink-0 text-xs text-zinc-400">
                                {getRelativeTime(new Date(entry.createdAt))}
                            </div>
                        </GlassCard>
                    );
                })}
            </div>

            {/* View All Button */}
            {entries.length >= limit && (
                <Button
                    variant="ghost"
                    asChild
                    className="w-full text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                >
                    <Link href="/tracker">
                        View all activity <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                </Button>
            )}
        </div>
    );
}

export default TrackerRecentActivity;
