'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/common/EmptyState';
import { Globe, ExternalLink, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface PlatformStat {
    id: string;
    name: string;
    slug: string;
    icon?: string | null;
    status: string;
    lastSyncedAt: string | null;
    cachedStats?: any;
}

interface ConnectedPlatformsStatsProps {
    platforms?: PlatformStat[];
    className?: string;
}

export function ConnectedPlatformsStats({ platforms = [], className }: ConnectedPlatformsStatsProps) {
    const connected = platforms.filter(p => p.status !== 'disconnected'); // Adjust logic as per 'connectionStatus' enum if strictly 'connected' or just not 'disconnected'

    return (
        <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
            {connected.length === 0 ? (
                <Card className="col-span-full border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                        <Globe className="w-10 h-10 text-zinc-300 mb-3" />
                        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">No Platforms Connected</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-4 max-w-sm">
                            Connect your accounts to see specific statistics here.
                        </p>
                        <Button size="sm" variant="outline" asChild>
                            <Link href="/platforms">Connect Platforms</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                connected.map((platform) => {
                    const stats = platform.cachedStats || {};

                    // Helper to determine metrics based on platform type
                    const getMetrics = () => {
                        const slug = platform.slug.toLowerCase();

                        if (slug.includes('github')) {
                            return [
                                { label: 'Commits', value: stats.totalCommits ?? stats.commits ?? 0 },
                                { label: 'PRs/Issues', value: (stats.totalPRs ?? 0) + (stats.issues ?? 0) }
                            ];
                        }

                        if (slug.includes('codeforces')) {
                            return [
                                { label: 'Rating', value: stats.rating ?? 'Unrated' },
                                { label: 'Rank', value: stats.rank ?? 'N/A' }
                            ];
                        }

                        if (slug.includes('leetcode')) {
                            return [
                                { label: 'Solved', value: stats.totalSolved ?? stats.problemsSolved ?? 0 },
                                { label: 'Global Rank', value: stats.ranking ?? stats.rank ?? 'N/A' }
                            ];
                        }

                        // Default / Fallback
                        return [
                            { label: 'Solved', value: stats.totalSolved ?? stats.problemsSolved ?? stats.totalProblems ?? 0 },
                            { label: 'Rank', value: stats.rank ?? stats.ranking ?? 'N/A' }
                        ];
                    };

                    const metrics = getMetrics();

                    return (
                        <Card key={platform.id} className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors group">
                            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                                <div className="flex items-center gap-2">
                                    {platform.icon ? (
                                        <img src={platform.icon} alt={platform.name} className="w-5 h-5 opacity-80" />
                                    ) : (
                                        <Globe className="w-5 h-5 text-zinc-400" />
                                    )}
                                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">{platform.name}</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    {platform.status === 'connected' ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-2">
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    {metrics.map((metric, idx) => (
                                        <div key={idx} className="bg-zinc-50 dark:bg-zinc-900 rounded p-2 text-center">
                                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">{metric.label}</div>
                                            <div className={cn(
                                                "font-bold text-zinc-900 dark:text-zinc-50",
                                                typeof metric.value === 'string' && metric.value.length > 8 ? "text-xs break-all" : "text-lg"
                                            )}>
                                                {metric.value}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between text-xs text-zinc-400">
                                    <span className="flex items-center gap-1">
                                        {platform.lastSyncedAt ? 'Synced recently' : 'Not synced'}
                                    </span>
                                    <Link href={`/platforms/${platform.slug}`} className="hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors flex items-center gap-1">
                                        Details <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })
            )}
        </div>
    );
}
