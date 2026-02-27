'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  XCircle,
  Clock,
  CheckCheck,
  Trophy,
  Target,
  Flame,
  RefreshCw,
  FileText,
  Sparkles,
  Shield,
  CreditCard,
  PartyPopper,
  ChevronRight,
  MoreVertical,
  Trash2,
  Archive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { NotificationService } from '@/services/api/notification.service';
import type { Notification, NotificationType } from '@/types/notification';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationListProps {
  userId?: string;
  className?: string;
  limit?: number;
}

const ICON_MAP: Record<string, any> = {
  Bell,
  Trophy,
  Target,
  CheckCircle: CheckCircle2,
  XCircle,
  AlertTriangle: AlertCircle,
  Flame,
  RefreshCw,
  FileText,
  Sparkles,
  Shield,
  CreditCard,
  PartyPopper,
  AlertCircle,
  Info,
};

const TYPE_THEME: Record<string, { color: string; bg: string; border: string }> = {
  achievement_unlocked: { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  goal_completed: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  goal_failed: { color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  streak_at_risk: { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  sync_failed: { color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  security_alert: { color: 'text-rose-600', bg: 'bg-rose-600/10', border: 'border-rose-600/20' },
  system: { color: 'text-zinc-500', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' },
};

const DEFAULT_THEME = { color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' };

export const NotificationList: React.FC<NotificationListProps> = ({
  userId,
  className = '',
  limit = 20
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await NotificationService.getList({ isRead: filter === 'unread' ? false : undefined }, 1, limit);
      setNotifications(data.items);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userId, filter, limit]);

  const markAllRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const markRead = async (id: string) => {
    try {
      await NotificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('Failed to mark read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await NotificationService.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const groupedNotifications = useMemo(() => {
    const groups: Record<string, Notification[]> = {
      Today: [],
      Yesterday: [],
      Older: [],
    };

    notifications.forEach(n => {
      const date = new Date(n.createdAt);
      if (isToday(date)) groups.Today.push(n);
      else if (isYesterday(date)) groups.Yesterday.push(n);
      else groups.Older.push(n);
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [notifications]);

  if (loading && notifications.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-white/50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-8", className)}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            <Bell className="w-8 h-8 text-indigo-500" />
            Activity Center
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mt-1">Updates & Alerts</p>
        </div>

        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          {(['all', 'unread'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                filter === f
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
              )}
            >
              {f}
            </button>
          ))}
          <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />
          <button
            onClick={markAllRead}
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors group"
            title="Mark all as read"
          >
            <CheckCheck className="w-4 h-4 text-zinc-400 group-hover:text-indigo-500" />
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {notifications.length === 0 ? (
          <GlassCard className="py-20 flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-full mb-4">
              <Bell className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-50">All Clear</h3>
            <p className="text-sm text-zinc-500 max-w-xs mt-1">
              You've caught up with everything {filter === 'unread' && "unread"}.
            </p>
          </GlassCard>
        ) : (
          <AnimatePresence>
            {groupedNotifications.map(([label, items]) => (
              <div key={label} className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{label}</span>
                  <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800" />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {items.map(notif => {
                    const theme = TYPE_THEME[notif.type] || DEFAULT_THEME;
                    // In a real app, you'd map the icon string from NOTIFICATION_TYPE_CONFIG
                    // For now, we'll use a fallback or map if available
                    const Icon = ICON_MAP[notif.type.toUpperCase()] || Bell;

                    return (
                      <motion.div
                        key={notif.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        <GlassCard
                          className={cn(
                            "group p-0 overflow-hidden border-zinc-200 dark:border-zinc-800 transition-all hover:border-indigo-500/50",
                            !notif.isRead && "border-l-4 border-l-indigo-500"
                          )}
                        >
                          <div className="flex items-stretch min-h-[90px]">
                            <div className={cn("w-16 flex items-center justify-center transition-colors", theme.bg)}>
                              <Icon className={cn("w-6 h-6", theme.color)} />
                            </div>
                            <div className="flex-1 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className={cn(
                                    "font-bold text-zinc-900 dark:text-zinc-50 tracking-tight",
                                    !notif.isRead && "text-indigo-600 dark:text-indigo-400"
                                  )}>
                                    {notif.title}
                                  </h4>
                                  {!notif.isRead && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />}
                                </div>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium leading-snug">
                                  {notif.message}
                                </p>
                              </div>

                              <div className="flex items-center justify-between md:flex-col md:items-end gap-2">
                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                  <Clock className="w-3 h-3" />
                                  {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {!notif.isRead && (
                                    <button
                                      onClick={() => markRead(notif.id)}
                                      className="p-2 hover:bg-emerald-500/10 rounded-lg transition-colors group/btn"
                                      title="Mark as read"
                                    >
                                      <CheckCircle2 className="w-4 h-4 text-zinc-400 group-hover/btn:text-emerald-500" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => deleteNotification(notif.id)}
                                    className="p-2 hover:bg-rose-500/10 rounded-lg transition-colors group/btn"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4 text-zinc-400 group-hover/btn:text-rose-500" />
                                  </button>
                                  {notif.actionUrl && (
                                    <button
                                      onClick={() => window.location.href = notif.actionUrl!}
                                      className="p-2 hover:bg-indigo-500/10 rounded-lg transition-colors group/btn"
                                      title="View Details"
                                    >
                                      <ChevronRight className="w-4 h-4 text-zinc-400 group-hover/btn:text-indigo-500" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default NotificationList;
