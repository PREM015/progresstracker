// src/types/push.ts
// Push notification subscription types

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type PushNotificationType =
  | 'achievement_unlocked'
  | 'streak_at_risk'
  | 'streak_broken'
  | 'goal_deadline'
  | 'goal_completed'
  | 'sync_completed'
  | 'sync_failed'
  | 'reminder'
  | 'announcement'
  | 'subscription_expiring'
  | 'payment_failed';

export type PushSubscriptionStatus = 'active' | 'expired' | 'revoked';

// =============================================================================
// CORE INTERFACES
// =============================================================================

/** Web Push subscription record (matches Prisma PushSubscription model) */
export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  status: PushSubscriptionStatus;
  deviceType?: string | null;
  browser?: string | null;
  os?: string | null;
  userAgent?: string | null;
  lastUsedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Push notification payload */
export interface PushNotificationPayload {
  type: PushNotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string; // Click action URL
  tag?: string; // For notification deduplication
  data?: Record<string, unknown>;
}

/** Push notification send result */
export interface PushNotificationResult {
  subscriptionId: string;
  success: boolean;
  statusCode?: number;
  error?: string;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface SubscribePushInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

export interface UnsubscribePushInput {
  endpoint: string;
}

export interface SendPushNotificationInput {
  userId: string;
  payload: PushNotificationPayload;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

export interface PushSubscriptionListResponse {
  subscriptions: PushSubscription[];
  total: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getPushNotificationIcon(type: PushNotificationType): string {
  const icons: Record<PushNotificationType, string> = {
    achievement_unlocked: '🏆',
    streak_at_risk: '⚠️',
    streak_broken: '💔',
    goal_deadline: '⏰',
    goal_completed: '🎯',
    sync_completed: '✅',
    sync_failed: '❌',
    reminder: '🔔',
    announcement: '📢',
    subscription_expiring: '💳',
    payment_failed: '🚨',
  };
  return icons[type] || '🔔';
}

export default PushSubscription;
