// src/components/connections/SyncLogs.tsx

'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Trash2,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SyncLog {
  id: string;
  status: string;
  message?: string;
  createdAt: string;
  platform?: {
    name: string;
    icon?: string;
    slug: string;
  };
}

interface SyncLogsProps {
  platformId?: string;
  limit?: number;
  className?: string;
}

export function SyncLogs({ platformId, limit = 20, className }: SyncLogsProps) {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stats, setStats] = useState<Record<string, number>>({});

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let url = `/api/sync/logs?limit=${limit}`;
      if (platformId) url += `&platformId=${platformId}`;
      if (statusFilter !== 'all') url += `&status=${statusFilter}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch logs');

      const data = await response.json();
      setLogs(data.logs || []);
      setStats(data.stats || {});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [platformId, statusFilter]);

  const handleClearLogs = async (days: number = 30) => {
    if (!confirm(`Delete logs older than ${days} days?`)) return;

    try {
      const response = await fetch(`/api/sync/logs?olderThan=${days}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete logs');

      const data = await response.json();
      alert(data.message);
      fetchLogs();
    } catch (err: any) {
      alert('Failed to delete logs: ' + err.message);
    }
  };

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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'destructive' | 'default'> = {
      success: 'success',
      failed: 'destructive',
      running: 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle>Sync Logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Sync Logs</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="running">Running</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleClearLogs(30)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Old
            </Button>
            <Button variant="outline" size="sm" onClick={fetchLogs}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="flex gap-4 mb-4 text-sm">
          <span className="text-muted-foreground">
            Total: <strong>{stats.total || 0}</strong>
          </span>
          <span className="text-green-600">
            Success: <strong>{stats.success || 0}</strong>
          </span>
          <span className="text-red-600">
            Failed: <strong>{stats.failed || 0}</strong>
          </span>
        </div>

        {/* Logs List */}
        {error ? (
          <div className="text-center py-8 text-red-500">
            <XCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2" />
            <p>No sync logs found</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(log.status)}
                  <div>
                    <p className="font-medium text-sm">
                      {log.platform?.name || 'All Platforms'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.message || `Status: ${log.status}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(log.status)}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(log.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SyncLogs;