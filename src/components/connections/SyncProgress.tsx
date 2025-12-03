// src/components/connections/SyncProgress.tsx

'use client';

import React from 'react';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/Progress';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useSync } from '@/context/SyncContext';
import { cn } from '@/lib/utils';

interface SyncProgressProps {
  className?: string;
  showDetails?: boolean;
}

export function SyncProgress({ className, showDetails = true }: SyncProgressProps) {
  const { currentJob, isSyncing, cancelSync } = useSync();

  if (!currentJob || !isSyncing) {
    return null;
  }

  const getStatusColor = () => {
    if (currentJob.failedPlatforms > 0) return 'text-yellow-500';
    return 'text-blue-500';
  };

  const getStatusIcon = () => {
    if (currentJob.status === 'success') {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (currentJob.status === 'failed') {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    if (currentJob.failedPlatforms > 0) {
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
    return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">
              {currentJob.status === 'running'
                ? 'Syncing platforms...'
                : currentJob.status === 'success'
                ? 'Sync complete!'
                : currentJob.status === 'failed'
                ? 'Sync failed'
                : 'Sync partially complete'}
            </span>
          </div>
          {currentJob.status === 'running' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => cancelSync(currentJob.id)}
            >
              Cancel
            </Button>
          )}
        </div>

        <Progress value={currentJob.progress} className="h-2 mb-2" />

        {showDetails && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {currentJob.completedPlatforms} of {currentJob.totalPlatforms} complete
            </span>
            <span className={getStatusColor()}>
              {currentJob.progress}%
            </span>
          </div>
        )}

        {showDetails && currentJob.failedPlatforms > 0 && (
          <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
            ⚠️ {currentJob.failedPlatforms} platform(s) failed to sync
          </div>
        )}

        {currentJob.error && (
          <div className="mt-2 text-sm text-red-600 dark:text-red-400">
            Error: {currentJob.error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SyncProgress;