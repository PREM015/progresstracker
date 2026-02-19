'use client';

import React from 'react';
import {
    CheckCircle2,
    XCircle,
    AlertCircle,
    Clock,
    RefreshCcw,
    ArrowUpRight
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

export interface SyncLogEntry {
    id: string;
    platformId: string;
    platformName: string;
    status: 'success' | 'partial' | 'failed';
    message: string;
    timestamp: Date;
    duration?: number;
    itemsSynced?: number;
}

interface SyncHistoryProps {
    logs: SyncLogEntry[];
    isLoading?: boolean;
}

export function SyncHistory({ logs, isLoading }: SyncHistoryProps) {
    if (isLoading) {
        return (
            <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-muted rounded-lg" />
                ))}
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                    <Clock className="h-10 w-10 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No sync history available yet.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <RefreshCcw className="h-4 w-4" />
                        Sync History
                    </CardTitle>
                    <Badge variant="outline" className="font-normal">
                        Last 24 hours
                    </Badge>
                </div>
                <CardDescription>
                    Detailed log of your platform synchronization activities.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0 group"
                        >
                            <div className="mt-1">
                                {log.status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                                {log.status === 'partial' && <AlertCircle className="h-5 w-5 text-amber-500" />}
                                {log.status === 'failed' && <XCircle className="h-5 w-5 text-destructive" />}
                            </div>

                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-sm">{log.platformName}</span>
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatDistanceToNow(log.timestamp)} ago
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-1 group-hover:line-clamp-none transition-all">
                                    {log.message}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    {log.itemsSynced !== undefined && (
                                        <Badge variant="secondary" className="text-[10px] h-4 py-0 px-1.5 font-normal">
                                            {log.itemsSynced} items
                                        </Badge>
                                    )}
                                    {log.duration !== undefined && (
                                        <span className="text-[10px] text-muted-foreground italic">
                                            Took {log.duration}ms
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowUpRight className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
