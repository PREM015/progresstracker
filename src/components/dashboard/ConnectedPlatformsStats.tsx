import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Globe, ExternalLink, RefreshCw, CheckCircle2, AlertCircle, Zap, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import { useState, useEffect } from 'react';

interface PlatformStat {
    id: string;
    name: string;
    slug: string;
    icon?: string | null;
    status: string;
    lastSyncedAt: string | null;
    totalProblems?: number;
    totalPoints?: number;
    cachedStats?: Record<string, string | number | null>;
}

interface ConnectedPlatformsStatsProps {
    className?: string;
}

export function ConnectedPlatformsStats({ className }: ConnectedPlatformsStatsProps) {
    const [platforms, setPlatforms] = useState<PlatformStat[]>([]);
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

    const connected = platforms.filter(p => p.status !== 'disconnected');

    if (loading) {
        return (
            <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", className)}>
                {[1, 2, 3].map(i => (
                    <div key={i} className="glass-card h-48 animate-pulse bg-zinc-100 dark:bg-zinc-900 shadow-2xl" />
                ))}
            </div>
        );
    }

    return (
        <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", className)}>
            {connected.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="col-span-full glass-card border-white/5 p-12 flex flex-col items-center justify-center text-center group hover:border-white/10 transition-all duration-300 shadow-2xl"
                >
                    <div className="w-20 h-20 rounded-3xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 flex items-center justify-center mb-6 shadow-2xl group-hover:scale-110 transition-transform">
                        <Globe className="w-10 h-10 text-zinc-400 dark:text-zinc-700" />
                    </div>
                    <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Isolated Ecosystem</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-500 font-medium mt-2 mb-8 max-w-sm">
                        Sync your accounts to unify your progress across the digital frontier.
                    </p>
                    <Button size="lg" className="rounded-2xl font-black uppercase tracking-widest px-8 shadow-xl shadow-primary/20" asChild>
                        <Link href="/platforms">Unify Platforms</Link>
                    </Button>
                </motion.div>
            ) : (
                connected.map((platform, idx) => {
                    const stats = platform.cachedStats || {};

                    const getMetrics = () => {
                        const slug = (platform.slug || '').toLowerCase();
                        if (slug.includes('github')) {
                            return [
                                { label: 'Commits', value: stats.totalCommits ?? stats.commits ?? 0 },
                                { label: 'Activity', value: Number(stats.totalPRs ?? 0) + Number(stats.issues ?? 0), unit: 'PR/BUG' }
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
                                { label: 'Solved', value: stats.totalSolved ?? stats.problemsSolved ?? stats.totalProblems ?? 0 },
                                { label: 'Global', value: stats.ranking ?? stats.rank ?? 'N/A', unit: 'RANK' }
                            ];
                        }
                        return [
                            { label: 'Solved', value: stats.totalSolved ?? stats.problemsSolved ?? stats.totalProblems ?? 0 },
                            { label: 'Status', value: stats.rank ?? stats.ranking ?? 'N/A' }
                        ];
                    };

                    const metrics = getMetrics();

                    return (
                        <motion.div
                            key={platform.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1, duration: 0.5 }}
                            className="group"
                        >
                            <div className="glass-card p-6 h-full relative overflow-hidden flex flex-col border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-all duration-300 shadow-2xl">
                                <div className="flex justify-between items-center mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all">
                                            {platform.icon ? (
                                                <img src={platform.icon} alt={platform.name} className="w-5 h-5 object-contain" />
                                            ) : (
                                                <Globe className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-sm text-zinc-900 dark:text-white uppercase tracking-wider">{platform.name}</h3>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                {platform.status === 'connected' ? (
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                                        <span className="text-[8px] font-black text-emerald-500/80 uppercase tracking-widest">Active Sync</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-1 h-1 rounded-full bg-amber-500" />
                                                        <span className="text-[8px] font-black text-amber-500/80 uppercase tracking-widest">Auth Warning</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-black/0 dark:bg-white/0 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors">
                                        <Link href={`/platforms/${platform.slug}`}>
                                            <ExternalLink className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-600 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
                                        </Link>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    {metrics.map((metric, midx) => (
                                        <div key={midx} className="bg-zinc-100 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 rounded-2xl p-4 transition-all group-hover:bg-zinc-200 dark:group-hover:bg-zinc-900/80">
                                            <div className="text-[10px] text-zinc-600 dark:text-zinc-500 font-black uppercase tracking-[0.1em] mb-1">{metric.label}</div>
                                            <div className="flex items-baseline gap-1">
                                                <span className={cn(
                                                    "font-black text-zinc-900 dark:text-white leading-none",
                                                    typeof metric.value === 'string' && metric.value.length > 8 ? "text-sm" : "text-2xl"
                                                )}>
                                                    {metric.value}
                                                </span>
                                                {metric.unit && <span className="text-[8px] font-black text-zinc-500 dark:text-zinc-600 uppercase">{metric.unit}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-auto flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900/40 border border-black/5 dark:border-white/5">
                                        <ShieldCheck className="w-3 h-3 text-zinc-500 dark:text-zinc-600" />
                                        <span className="text-[8px] font-black text-zinc-500 dark:text-zinc-600 uppercase tracking-widest">
                                            {platform.lastSyncedAt ? 'Verified' : 'Pending'}
                                        </span>
                                    </div>
                                    <span className="text-[8px] font-black text-zinc-500 dark:text-zinc-600 uppercase tracking-widest">
                                        Node v.1.0.4
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    );
                })
            )}
        </div>
    );
}

