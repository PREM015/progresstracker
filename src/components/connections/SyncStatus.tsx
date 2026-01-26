// src/components/connections/SyncStatus.tsx

'use client';

import React from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useSync } from '@/context/SyncContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface SyncStatusProps {
  className?: string;
}

export function SyncStatus({ className }: SyncStatusProps) {
  const { syncState, currentJob, isSyncing, triggerSync, cancelSync } = useSync();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'destructive' | 'warning' | 'default'> = {
      success: 'success',
      failed: 'destructive',
      running: 'default',
      partial: 'warning',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Sync Status</CardTitle>
          <div className="flex items-center gap-2">
            {isSyncing && currentJob && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => cancelSync(currentJob.id)}
              >
                Cancel
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={() => triggerSync()}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Job Progress */}
        {currentJob && currentJob.status === 'running' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Syncing platforms...</span>
              <span className="font-medium">{currentJob.progress}%</span>
            </div>
            <Progress value={currentJob.progress} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {currentJob.completedPlatforms} of {currentJob.totalPlatforms} complete
              </span>
              {currentJob.failedPlatforms > 0 && (
                <span className="text-red-500">
                  {currentJob.failedPlatforms} failed
                </span>
              )}
            </div>
          </div>
        )}

        {/* Last Sync Info */}
        {!isSyncing && syncState?.lastSync && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last sync:</span>
            <span className="font-medium">
              {formatDistanceToNow(new Date(syncState.lastSync), { addSuffix: true })}
            </span>
          </div>
        )}

        {/* Recent Sync Logs */}
        {syncState?.recentLogs && syncState.recentLogs.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Recent Activity</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {syncState.recentLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(log.status)}
                    <span className="text-sm font-medium">
                      {log.platform?.name || 'All Platforms'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(log.status)}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Platform Statuses */}
        {syncState?.platformStatuses && Object.keys(syncState.platformStatuses).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Platform Status</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(syncState.platformStatuses).map(([slug, status]) => (
                <div
                  key={slug}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <span className="text-sm capitalize">{slug}</span>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(status.status)}
                    <span className="text-xs text-muted-foreground">
                      {status.entriesCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SyncStatus;