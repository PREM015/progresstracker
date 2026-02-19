'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Code, FileText, Trophy, Activity, GitCommit } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { EmptyState } from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';;

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
            return <Code className="h-4 w-4 text-indigo-500" />;
        case 'achievement':
            return <Trophy className="h-4 w-4 text-amber-500" />;
        case 'goal':
            return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
        case 'post':
            return <FileText className="h-4 w-4 text-zinc-500" />;
        default:
            return <Activity className="h-4 w-4 text-zinc-400" />;
    }
};

export function RecentActivityList({ activities = [], className }: RecentActivityListProps) {
    return (
        <Card className={cn("h-full border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm", className)}>
            <CardHeader>
                <CardTitle className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Recent Activity</CardTitle>
                <CardDescription className="text-zinc-500 dark:text-zinc-400">
                    Your latest actions across all platforms.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                {activities.length === 0 ? (
                    <div className="p-6">
                        <EmptyState
                            title="No activity yet"
                            description="Start solving problems to populate your timeline."
                            variant="small"
                            icon={Activity}
                        />
                    </div>
                ) : (
                    <ScrollArea className="h-[350px]">
                        <div className="flex flex-col">
                            {activities.map((item) => (
                                <div key={item.id} className="flex gap-4 p-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                    <div className="mt-1 flex-shrink-0">
                                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
                                            {getIcon(item.type)}
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{item.title}</p>
                                            <span className="text-xs text-zinc-400 font-mono">
                                                {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{item.description}</p>

                                        <div className="flex items-center gap-2 mt-2">
                                            {item.platform && (
                                                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 font-medium">
                                                    {item.platform}
                                                </span>
                                            )}
                                            {item.points && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 border border-amber-200 dark:border-amber-900/30 font-medium">
                                                    +{item.points} pts
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
