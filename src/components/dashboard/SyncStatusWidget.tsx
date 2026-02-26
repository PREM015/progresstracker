'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Check,
  AlertCircle,
  Clock,
  Loader2,
  ChevronRight,
  Wifi,
  WifiOff
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface PlatformSyncStatus {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  status: 'synced' | 'syncing' | 'error' | 'pending' | 'idle';
  lastSyncedAt: string | null;
  nextSyncAt?: string | null;
  error?: string | null;
}

interface SyncStatusWidgetProps {
  className?: string;
}

const statusConfig = {
  synced: {
    icon: Check,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    label: 'Synced'
  },
  syncing: {
    icon: Loader2,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    label: 'Syncing'
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    label: 'Error'
  },
  pending: {
    icon: Clock,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    label: 'Pending'
  },
  idle: {
    icon: Clock,
    color: 'text-zinc-400',
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/20',
    label: 'Idle'
  },
};

export function SyncStatusWidget({ className }: SyncStatusWidgetProps) {
  const [platforms, setPlatforms] = useState<PlatformSyncStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchSyncStatus = async () => {
      try {
        const res = await fetch('/api/platforms/status');
        const json = await res.json();

        if (res.ok && json?.success) {
          if (isMounted) {
            setPlatforms(json.data?.platforms || []);
          }
        }
      } catch (error) {
        console.error('Failed to fetch sync status:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSyncStatus();

    // Poll for updates
    const interval = setInterval(fetchSyncStatus, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      await fetch('/api/sync/trigger-all', { method: 'POST' });
      // Refresh status after triggering
      const res = await fetch('/api/platforms/status');
      const json = await res.json();
      if (json?.success) {
        setPlatforms(json.data?.platforms || []);
      }
    } catch (error) {
      console.error('Failed to trigger sync:', error);
    } finally {
      setSyncing(false);
    }
  };

  const syncingCount = platforms.filter(p => p.status === 'syncing').length;
  const errorCount = platforms.filter(p => p.status === 'error').length;
  const syncedCount = platforms.filter(p => p.status === 'synced').length;

  if (loading) {
    return (
      <div className={cn("glass-card p-6 animate-pulse", className)}>
        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-zinc-200 dark:bg-zinc-800/50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.5 }}
      className={cn("h-full", className)}
    >
      <div className="glass-card h-full p-6 relative overflow-hidden flex flex-col border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-all duration-300 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-xl border",
              syncingCount > 0
                ? "bg-blue-500/10 border-blue-500/20"
                : errorCount > 0
                  ? "bg-red-500/10 border-red-500/20"
                  : "bg-emerald-500/10 border-emerald-500/20"
            )}>
              {syncingCount > 0 ? (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              ) : (
                <RefreshCw className={cn(
                  "w-4 h-4",
                  errorCount > 0 ? "text-red-500" : "text-emerald-500"
                )} />
              )}
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">Sync Status</h3>
              <p className="text-zinc-600 dark:text-zinc-500 font-bold text-[10px] uppercase tracking-widest">
                {syncingCount > 0
                  ? `${syncingCount} syncing...`
                  : errorCount > 0
                    ? `${errorCount} error${errorCount > 1 ? 's' : ''}`
                    : `${syncedCount} connected`}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSyncAll}
            disabled={syncing}
            className="hover:bg-black/5 dark:hover:bg-white/5 h-8 px-3"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Platform List */}
        <div className="flex-1 space-y-2 overflow-y-auto">
          {platforms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <WifiOff className="w-10 h-10 text-zinc-400 dark:text-zinc-700 mb-3" />
              <p className="text-zinc-900 dark:text-white font-bold">No Platforms Connected</p>
              <p className="text-zinc-600 dark:text-zinc-500 text-sm mt-1">Connect platforms to sync your progress</p>
              <Button asChild className="mt-4" size="sm">
                <Link href="/platforms">Connect Platform</Link>
              </Button>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {platforms.map((platform, idx) => {
                const cfg = statusConfig[platform.status] || statusConfig.idle;
                const StatusIcon = cfg.icon;

                return (
                  <motion.div
                    key={platform.id || platform.slug || `platform-${idx}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "group flex items-center gap-3 p-3 rounded-xl border transition-all",
                      cfg.bg, cfg.border
                    )}
                  >
                    {/* Platform Icon */}
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 flex items-center justify-center shrink-0">
                      {platform.icon ? (
                        <img
                          src={platform.icon}
                          alt={platform.name}
                          className="w-4 h-4 object-contain"
                        />
                      ) : (
                        <Wifi className="w-4 h-4 text-zinc-500" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                        {platform.name}
                      </div>
                      <div className="text-[10px] font-bold text-zinc-500">
                        {platform.lastSyncedAt
                          ? `Last: ${formatDistanceToNow(new Date(platform.lastSyncedAt), { addSuffix: true })}`
                          : 'Never synced'}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusIcon className={cn(
                        "w-4 h-4",
                        cfg.color,
                        platform.status === 'syncing' && "animate-spin"
                      )} />
                      <span className={cn("text-[10px] font-black uppercase tracking-wider", cfg.color)}>
                        {cfg.label}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        {platforms.length > 0 && (
          <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5">
            <Link
              href="/sync"
              className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 group"
            >
              View Sync History <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default SyncStatusWidget;