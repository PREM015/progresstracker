// src/components/connections/SyncHistory.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { SyncLog } from '@/types/sync';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SyncHistoryProps {
  platformId?: string;
  limit?: number;
  className?: string;
}

export function SyncHistory({ platformId, limit = 20, className }: SyncHistoryProps) {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const url = platformId 
          ? `/api/sync/${platformId}`
          : '/api/sync';
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch sync history');
        
        const data = await response.json();
        setLogs(data.recentLogs || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [platformId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const displayedLogs = isExpanded ? logs : logs.slice(0, 5);

  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="text-lg">Sync History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground">
            <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2" />
            <p>No sync history yet</p>
            <p className="text-sm">Sync your platforms to see history here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="text-lg">Sync History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayedLogs.map((log) => (
          <div
            key={log.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(log.status)}
              <div>
                <p className="text-sm font-medium">
                  {log.platform?.name || 'All Platforms'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {log.message || `Status: ${log.status}`}
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge
                variant={
                  log.status === 'success' ? 'success' :
                  log.status === 'failed' ? 'destructive' : 'default'
                }
                className="mb-1"
              >
                {log.status}
              </Badge>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}

        {logs.length > 5 && (
          <Button
            variant="ghost"
            className="w-full mt-2"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Show {logs.length - 5} More
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default SyncHistory;