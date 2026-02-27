/* eslint-disable @typescript-eslint/no-unused-vars */
// ===== FILE: src/types/notification.ts =====
// Complete notification types matching Prisma schema

import type {
  NotificationType as PrismaNotificationType,
   
  NotificationChannel as PrismaNotificationChannel,
  NotificationPriority as PrismaNotificationPriority,
} from '@prisma/client';

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/** Notification type */
export type NotificationType =
  | 'system'
  | 'achievement_unlocked'
  | 'goal_reminder'
  | 'goal_completed'
  | 'goal_failed'
  | 'streak_at_risk'
  | 'streak_broken'
  | 'streak_milestone'
  | 'sync_complete'
  | 'sync_failed'
  | 'weekly_report'
  | 'monthly_report'
  | 'new_feature'
  | 'security_alert'
  | 'billing_alert'
  | 'welcome'
  | 'custom';

/** Notification channel */
export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms';

/** Notification priority */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/** Notification status */
export type NotificationStatus = 'unread' | 'read' | 'archived' | 'dismissed';

/** Map Prisma types to local types */
export const NOTIFICATION_TYPE_MAP: Record<PrismaNotificationType, NotificationType> = {
  SYSTEM: 'system',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  GOAL_REMINDER: 'goal_reminder',
  GOAL_COMPLETED: 'goal_completed',
  GOAL_FAILED: 'goal_failed',
  STREAK_AT_RISK: 'streak_at_risk',
  STREAK_BROKEN: 'streak_broken',
  STREAK_MILESTONE: 'streak_milestone',
  SYNC_COMPLETE: 'sync_complete',
  SYNC_FAILED: 'sync_failed',
  WEEKLY_REPORT: 'weekly_report',
  MONTHLY_REPORT: 'monthly_report',
  NEW_FEATURE: 'new_feature',
  SECURITY_ALERT: 'security_alert',
  BILLING_ALERT: 'billing_alert',
  WELCOME: 'welcome',
  CUSTOM: 'custom',
  REFERRAL: 'custom'
};

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Main Notification interface */
export interface Notification {
  id: string;
  userId: string;
  
  // Type & Channel
  type: NotificationType;
  channel: NotificationChannel;
  priority: NotificationPriority;
  
  // Content
  title: string;
  message: string;
  shortMessage?: string;
  
  // Action
  actionUrl?: string;
  actionLabel?: string;
  
  // Related Entity
  entityType?: string;
  entityId?: string;
  
  // Rich Content
  imageUrl?: string;
  metadata?: Record<string, unknown>;
  
  // Status
  isRead: boolean;
  readAt?: Date;
  isArchived: boolean;
  archivedAt?: Date;
  isDismissed: boolean;
  dismissedAt?: Date;
  
  // Delivery
  isDelivered: boolean;
  deliveredAt?: Date;
  deliveryError?: string;
  
  // Scheduling
  scheduledFor?: Date;
  sentAt?: Date;
  
  // Expiry
  expiresAt?: Date;
  
  // Timestamps
  createdAt: Date;
}

/** Notification preferences */
export interface NotificationPreferences {
  id: string;
  userId: string;
  
  // Global Settings
  enabled: boolean;
  
  // Channels
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  smsEnabled: boolean;
  
  // Email Preferences
  emailAddress?: string;
  emailVerified: boolean;
  
  // Notification Types
  achievementAlerts: boolean;
  goalReminders: boolean;
  goalCompleted: boolean;
  streakAlerts: boolean;
  syncComplete: boolean;
  syncFailed: boolean;
  weeklyReport: boolean;
  monthlyReport: boolean;
  securityAlerts: boolean;
  billingAlerts: boolean;
  newFeatures: boolean;
  tips: boolean;
  communityUpdates: boolean;
  marketingEmails: boolean;
  
  // Quiet Hours
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursTimezone: string;
  
  // Digest Settings
  digestEnabled: boolean;
  digestFrequency: 'realtime' | 'daily' | 'weekly';
  digestTime: string;
  digestDay: number;
  
  // DND
  dndEnabled: boolean;
  dndUntil?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/** Push subscription */
export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  deviceId?: string;
  deviceName?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  isActive: boolean;
  lastUsedAt?: Date;
  successCount: number;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Notification group */
export interface NotificationGroup {
  type: NotificationType;
  count: number;
  notifications: Notification[];
  latestAt: Date;
}

/** Notification stats */
export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  archived: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
  lastReceivedAt?: Date;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

/** Create notification input */
export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  channel?: NotificationChannel;
  priority?: NotificationPriority;
  title: string;
  message: string;
  shortMessage?: string;
  actionUrl?: string;
  actionLabel?: string;
  entityType?: string;
  entityId?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
  scheduledFor?: Date;
  expiresAt?: Date;
}

/** Update notification preferences input */
export interface UpdateNotificationPreferencesInput {
  enabled?: boolean;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  achievementAlerts?: boolean;
  goalReminders?: boolean;
  goalCompleted?: boolean;
  streakAlerts?: boolean;
  syncComplete?: boolean;
  syncFailed?: boolean;
  weeklyReport?: boolean;
  monthlyReport?: boolean;
  securityAlerts?: boolean;
  newFeatures?: boolean;
  marketingEmails?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursTimezone?: string;
  digestEnabled?: boolean;
  digestFrequency?: 'realtime' | 'daily' | 'weekly';
  digestTime?: string;
  digestDay?: number;
}

/** Mark notifications input */
export interface MarkNotificationsInput {
  ids: string[];
  action: 'read' | 'unread' | 'archive' | 'dismiss' | 'delete';
}

/** Notification filter */
export interface NotificationFilter {
  type?: NotificationType | NotificationType[];
  priority?: NotificationPriority | NotificationPriority[];
  isRead?: boolean;
  isArchived?: boolean;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
}

// =============================================================================
// DISPLAY CONFIGURATIONS
// =============================================================================

/** Notification type configuration */
export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  defaultPriority: NotificationPriority;
}> = {
  system: {
    label: 'System',
    icon: 'Bell',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    defaultPriority: 'normal',
  },
  achievement_unlocked: {
    label: 'Achievement Unlocked',
    icon: 'Trophy',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    defaultPriority: 'normal',
  },
  goal_reminder: {
    label: 'Goal Reminder',
    icon: 'Target',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    defaultPriority: 'normal',
  },
  goal_completed: {
    label: 'Goal Completed',
    icon: 'CheckCircle',
    color: '#10B981',
    bgColor: '#D1FAE5',
    defaultPriority: 'normal',
  },
  goal_failed: {
    label: 'Goal Failed',
    icon: 'XCircle',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    defaultPriority: 'normal',
  },
  streak_at_risk: {
    label: 'Streak at Risk',
    icon: 'AlertTriangle',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    defaultPriority: 'high',
  },
  streak_broken: {
    label: 'Streak Broken',
    icon: 'Flame',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    defaultPriority: 'normal',
  },
  streak_milestone: {
    label: 'Streak Milestone',
    icon: 'Flame',
    color: '#F97316',
    bgColor: '#FFEDD5',
    defaultPriority: 'normal',
  },
  sync_complete: {
    label: 'Sync Complete',
    icon: 'RefreshCw',
    color: '#10B981',
    bgColor: '#D1FAE5',
    defaultPriority: 'low',
  },
  sync_failed: {
    label: 'Sync Failed',
    icon: 'AlertCircle',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    defaultPriority: 'high',
  },
  weekly_report: {
    label: 'Weekly Report',
    icon: 'FileText',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    defaultPriority: 'normal',
  },
  monthly_report: {
    label: 'Monthly Report',
    icon: 'FileText',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    defaultPriority: 'normal',
  },
  new_feature: {
    label: 'New Feature',
    icon: 'Sparkles',
    color: '#EC4899',
    bgColor: '#FCE7F3',
    defaultPriority: 'low',
  },
  security_alert: {
    label: 'Security Alert',
    icon: 'Shield',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    defaultPriority: 'urgent',
  },
  billing_alert: {
    label: 'Billing Alert',
    icon: 'CreditCard',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    defaultPriority: 'high',
  },
  welcome: {
    label: 'Welcome',
    icon: 'PartyPopper',
    color: '#10B981',
    bgColor: '#D1FAE5',
    defaultPriority: 'normal',
  },
  custom: {
    label: 'Notification',
    icon: 'Bell',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    defaultPriority: 'normal',
  },
};

/** Priority configuration */
export const PRIORITY_CONFIG: Record<NotificationPriority, {
  label: string;
  color: string;
  sortOrder: number;
}> = {
  low: { label: 'Low', color: '#6B7280', sortOrder: 1 },
  normal: { label: 'Normal', color: '#3B82F6', sortOrder: 2 },
  high: { label: 'High', color: '#F59E0B', sortOrder: 3 },
  urgent: { label: 'Urgent', color: '#EF4444', sortOrder: 4 },
};

/** Channel configuration */
export const CHANNEL_CONFIG: Record<NotificationChannel, {
  label: string;
  icon: string;
  description: string;
}> = {
  in_app: { label: 'In-App', icon: 'Bell', description: 'Notifications within the app' },
  email: { label: 'Email', icon: 'Mail', description: 'Email notifications' },
  push: { label: 'Push', icon: 'Smartphone', description: 'Browser push notifications' },
  sms: { label: 'SMS', icon: 'MessageSquare', description: 'Text message notifications' },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get notification type config */
export function getNotificationTypeConfig(type: NotificationType) {
  return NOTIFICATION_TYPE_CONFIG[type];
}

/** Get priority config */
export function getPriorityConfig(priority: NotificationPriority) {
  return PRIORITY_CONFIG[priority];
}

/** Check if notification is expired */
export function isNotificationExpired(notification: Notification): boolean {
  if (!notification.expiresAt) return false;
  return new Date() > new Date(notification.expiresAt);
}

/** Group notifications by type */
export function groupNotificationsByType(notifications: Notification[]): NotificationGroup[] {
  const groups: Map<NotificationType, NotificationGroup> = new Map();
  
  notifications.forEach((n) => {
    if (groups.has(n.type)) {
      const group = groups.get(n.type)!;
      group.count++;
      group.notifications.push(n);
      if (new Date(n.createdAt) > group.latestAt) {
        group.latestAt = new Date(n.createdAt);
      }
    } else {
      groups.set(n.type, {
        type: n.type,
        count: 1,
        notifications: [n],
        latestAt: new Date(n.createdAt),
      });
    }
  });
  
  return Array.from(groups.values()).sort(
    (a, b) => b.latestAt.getTime() - a.latestAt.getTime()
  );
}

/** Sort notifications by priority */
export function sortByPriority(notifications: Notification[]): Notification[] {
  return [...notifications].sort((a, b) => {
    const priorityA = PRIORITY_CONFIG[a.priority].sortOrder;
    const priorityB = PRIORITY_CONFIG[b.priority].sortOrder;
    if (priorityA !== priorityB) return priorityB - priorityA;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/** Format notification time */
export function formatNotificationTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

/** Check if in quiet hours */
export function isInQuietHours(prefs: NotificationPreferences): boolean {
  if (!prefs.quietHoursEnabled) return false;
  
  const now = new Date();
  const [startH, startM] = prefs.quietHoursStart.split(':').map(Number);
  const [endH, endM] = prefs.quietHoursEnd.split(':').map(Number);
  
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

export default Notification;