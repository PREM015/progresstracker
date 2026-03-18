'use client';

import { cn } from '@/lib/utils';
import { Globe, ExternalLink, Clock, TrendingUp, Code2, GitBranch, Star, Award, Zap, Users, BookOpen, Target } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Types — matches /api/platforms/status response shape
// ---------------------------------------------------------------------------
interface PlatformData {
    platformId: string;
    platform: {
        id: string;
        name: string;
        slug: string;
        icon: string | null;
        color: string | null;
        category: string | null;
    };
    connectionStatus: string;
    syncStatus: string;
    lastSyncedAt: string | null;
    isActive: boolean;
    cachedStats: Record<string, any> | null;
}

interface ConnectedPlatformsStatsProps {
    className?: string;
}

// ---------------------------------------------------------------------------
// Platform-specific metric configs — shows REAL synced data only
// ---------------------------------------------------------------------------
function getPlatformMetrics(slug: string, stats: Record<string, any>): { label: string; value: string | number; icon: any }[] {
    const s = (slug || '').toLowerCase();

    if (s.includes('leetcode')) {
        return [
            { label: 'Solved', value: stats.totalSolved ?? stats.problemsSolved ?? stats.totalProblems ?? 0, icon: Code2 },
            { label: 'Easy', value: stats.easy ?? stats.easySolved ?? 0, icon: Target },
            { label: 'Medium', value: stats.medium ?? stats.mediumSolved ?? 0, icon: Target },
            { label: 'Hard', value: stats.hard ?? stats.hardSolved ?? 0, icon: Target },
            { label: 'Ranking', value: stats.ranking ?? stats.rank ?? '—', icon: Award },
            { label: 'Acceptance', value: stats.acceptanceRate ? `${stats.acceptanceRate}%` : '—', icon: TrendingUp },
        ].filter(m => m.value !== 0 && m.value !== '—' && m.value !== undefined);
    }

    if (s.includes('github')) {
        return [
            { label: 'Repos', value: stats.totalRepos ?? stats.publicRepos ?? stats.repos ?? 0, icon: BookOpen },
            { label: 'Commits', value: stats.totalCommits ?? stats.commits ?? 0, icon: GitBranch },
            { label: 'Stars', value: stats.totalStars ?? stats.stars ?? 0, icon: Star },
            { label: 'PRs', value: stats.totalPRs ?? stats.pullRequests ?? 0, icon: GitBranch },
            { label: 'Followers', value: stats.followers ?? 0, icon: Users },
            { label: 'Contributions', value: stats.contributions ?? stats.totalContributions ?? 0, icon: TrendingUp },
        ].filter(m => m.value !== 0 && m.value !== '—' && m.value !== undefined);
    }

    if (s.includes('codeforces')) {
        return [
            { label: 'Rating', value: stats.rating ?? 'Unrated', icon: Award },
            { label: 'Max Rating', value: stats.maxRating ?? stats.maxrating ?? '—', icon: TrendingUp },
            { label: 'Rank', value: stats.rank ?? '—', icon: Star },
            { label: 'Solved', value: stats.totalSolved ?? stats.problemsSolved ?? 0, icon: Code2 },
            { label: 'Contests', value: stats.contests ?? stats.contestsParticipated ?? 0, icon: Zap },
        ].filter(m => m.value !== 0 && m.value !== '—' && m.value !== 'Unrated' && m.value !== undefined);
    }

    if (s.includes('codechef')) {
        return [
            { label: 'Rating', value: stats.rating ?? 'Unrated', icon: Award },
            { label: 'Stars', value: stats.stars ?? '—', icon: Star },
            { label: 'Solved', value: stats.totalSolved ?? stats.problemsSolved ?? 0, icon: Code2 },
            { label: 'Division', value: stats.division ?? '—', icon: Target },
        ].filter(m => m.value !== 0 && m.value !== '—' && m.value !== 'Unrated' && m.value !== undefined);
    }

    if (s.includes('hackerrank') || s.includes('hacker-rank')) {
        return [
            { label: 'Badges', value: stats.badges ?? stats.totalBadges ?? 0, icon: Award },
            { label: 'Solved', value: stats.totalSolved ?? stats.problemsSolved ?? 0, icon: Code2 },
            { label: 'Score', value: stats.score ?? stats.totalScore ?? 0, icon: Star },
            { label: 'Certificates', value: stats.certificates ?? 0, icon: Target },
        ].filter(m => m.value !== 0 && m.value !== '—' && m.value !== undefined);
    }

    if (s.includes('geeksforgeeks') || s.includes('gfg')) {
        return [
            { label: 'Solved', value: stats.totalSolved ?? stats.problemsSolved ?? 0, icon: Code2 },
            { label: 'Score', value: stats.codingScore ?? stats.score ?? 0, icon: Star },
            { label: 'Rank', value: stats.rank ?? stats.instituteRank ?? '—', icon: Award },
            { label: 'Streak', value: stats.currentStreak ?? stats.streak ?? 0, icon: Zap },
        ].filter(m => m.value !== 0 && m.value !== '—' && m.value !== undefined);
    }

    // Generic fallback — show whatever stats are available
    const genericMetrics: { label: string; value: any; icon: any }[] = [];
    const priorityKeys = ['totalSolved', 'problemsSolved', 'rating', 'rank', 'score', 'totalProblems', 'commits', 'stars', 'followers', 'contributions'];

    for (const key of priorityKeys) {
        if (stats[key] !== undefined && stats[key] !== null && stats[key] !== 0 && stats[key] !== '') {
            genericMetrics.push({
                label: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim(),
                value: stats[key],
                icon: Code2,
            });
        }
        if (genericMetrics.length >= 4) break;
    }

    return genericMetrics;
}

// ---------------------------------------------------------------------------
// Platform brand colors
// ---------------------------------------------------------------------------
function getPlatformColor(slug: string, fallbackColor?: string | null): string {
    const s = (slug || '').toLowerCase();
    if (s.includes('leetcode')) return '#FFA116';
    if (s.includes('github')) return '#8b5cf6';
    if (s.includes('codeforces')) return '#1890FF';
    if (s.includes('codechef')) return '#5B4638';
    if (s.includes('hackerrank')) return '#00EA64';
    if (s.includes('geeksforgeeks') || s.includes('gfg')) return '#2F8D46';
    if (s.includes('hackerearth')) return '#2C3454';
    if (s.includes('kaggle')) return '#20BEFF';
    if (s.includes('gitlab')) return '#FC6D26';
    if (s.includes('bitbucket')) return '#0052CC';
    return fallbackColor || '#6366F1';
}

function timeAgo(dateStr: string | null): string {
    if (!dateStr) return 'Never synced';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ConnectedPlatformsStats({ className }: ConnectedPlatformsStatsProps) {
    const [platforms, setPlatforms] = useState<PlatformData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchStatus = async () => {
            try {
                const res = await fetch('/api/platforms/status');
                const json = await res.json();
                if (res.ok && json?.success && isMounted) {
                    setPlatforms(json.data?.platforms || []);
                }
            } catch (error) {
                console.error('Failed to fetch platform status:', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchStatus();
        return () => { isMounted = false; };
    }, []);

    const connected = useMemo(
        () => platforms.filter(p => p.connectionStatus !== 'disconnected'),
        [platforms]
    );

    // LOADING
    if (loading) {
        return (
            <div className={cn("space-y-4", className)}>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Connected Platforms</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-52 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50" />
                    ))}
                </div>
            </div>
        );
    }

    // EMPTY
    if (connected.length === 0) {
        return (
            <div className={cn("space-y-4", className)}>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Connected Platforms</h2>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700/50 p-12 flex flex-col items-center justify-center text-center"
                >
                    <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center mb-4">
                        <Globe className="w-8 h-8 text-zinc-400 dark:text-zinc-600" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No Platforms Connected</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 mb-6 max-w-sm">
                        Connect your coding platforms to track your progress across LeetCode, GitHub, Codeforces, and more.
                    </p>
                    <Link
                        href="/platforms"
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-500/25"
                    >
                        Connect Platforms
                    </Link>
                </motion.div>
            </div>
        );
    }

    // CONNECTED PLATFORMS
    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                    Connected Platforms
                    <span className="ml-2 text-xs font-medium text-zinc-400 dark:text-zinc-500">
                        {connected.length} active
                    </span>
                </h2>
                <Link
                    href="/platforms"
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                >
                    Manage →
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {connected.map((item, idx) => {
                    const p = item.platform;
                    const stats = item.cachedStats || {};
                    const metrics = getPlatformMetrics(p.slug, stats);
                    const brandColor = getPlatformColor(p.slug, p.color);
                    const isHealthy = item.connectionStatus === 'connected';

                    return (
                        <motion.div
                            key={item.platformId}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.08, duration: 0.4 }}
                            className="group"
                        >
                            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 shadow-sm hover:shadow-md dark:shadow-none h-full flex flex-col">
                                {/* Color accent bar */}
                                <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${brandColor}, ${brandColor}88)` }} />

                                {/* Header */}
                                <div className="p-5 pb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 group-hover:scale-105 transition-transform"
                                        >
                                            {p.icon ? (
                                                <img src={p.icon} alt={p.name} className="w-5 h-5 object-contain" />
                                            ) : (
                                                <Globe className="w-5 h-5 text-zinc-500" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">{p.name}</h3>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    isHealthy ? "bg-emerald-500" : "bg-amber-500"
                                                )} />
                                                <span className={cn(
                                                    "text-[10px] font-semibold",
                                                    isHealthy ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                                                )}>
                                                    {isHealthy ? 'Synced' : 'Needs Auth'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <Link
                                        href="/connected-platforms"
                                        className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                        title={`Manage ${p.name}`}
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>
                                </div>

                                {/* Metrics Grid — REAL DATA ONLY */}
                                <div className="px-5 pb-4 flex-1">
                                    {metrics.length > 0 ? (
                                        <div className={cn(
                                            "grid gap-2",
                                            metrics.length <= 2 ? "grid-cols-2" : metrics.length <= 4 ? "grid-cols-2" : "grid-cols-3"
                                        )}>
                                            {metrics.slice(0, 6).map((metric, midx) => {
                                                const IconComp = metric.icon;
                                                return (
                                                    <div
                                                        key={midx}
                                                        className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/50 p-3 transition-colors group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800"
                                                    >
                                                        <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                                                            <IconComp className="w-2.5 h-2.5" />
                                                            {metric.label}
                                                        </div>
                                                        <div className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">
                                                            {typeof metric.value === 'number'
                                                                ? metric.value.toLocaleString()
                                                                : metric.value}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-20 text-sm text-zinc-400 dark:text-zinc-500">
                                            No data synced yet
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500">
                                        <Clock className="w-3 h-3" />
                                        <span className="text-[10px] font-medium">
                                            {timeAgo(item.lastSyncedAt)}
                                        </span>
                                    </div>
                                    {p.category && (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                            {p.category}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}

export default ConnectedPlatformsStats;
