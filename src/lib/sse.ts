// src/lib/sse.ts
/**
 * Server-Sent Events (SSE) Utilities
 * Complete implementation with all utilities
 */

import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

export interface SSEEvent<T = unknown> {
  id?: string;
  event?: string;
  data: T;
  retry?: number;
}

export interface SSEConnectionOptions {
  heartbeatInterval?: number;
  retryInterval?: number;
  maxConnections?: number;
  onClose?: () => void;
  onError?: (error: Error) => void;
}

export interface SSEClient {
  id: string;
  userId: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
  createdAt: Date;
  lastPing: Date;
  channel: string;
  metadata?: Record<string, unknown>;
  messageCount: number;
  bytesTransferred: number;
}

export interface SSEConnectionStats {
  id: string;
  userId: string;
  channel: string;
  createdAt: Date;
  lastPing: Date;
  duration: number;
  messageCount: number;
  bytesTransferred: number;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const log = logger.child({ module: 'SSE' });

const DEFAULT_HEARTBEAT_INTERVAL = 30000;
const DEFAULT_RETRY_INTERVAL = 5000;
const DEFAULT_MAX_CONNECTIONS_PER_USER = 5;
const TEXT_ENCODER = new TextEncoder();

// =============================================================================
// SSE MESSAGE FORMATTING
// =============================================================================

export function formatSSEMessage<T>(event: SSEEvent<T>): string {
  const lines: string[] = [];

  if (event.id) {
    lines.push(`id: ${event.id}`);
  }

  if (event.event) {
    lines.push(`event: ${event.event}`);
  }

  if (event.retry !== undefined) {
    lines.push(`retry: ${event.retry}`);
  }

  const dataString = typeof event.data === 'string' 
    ? event.data 
    : JSON.stringify(event.data);
  
  const dataLines = dataString.split('\n');
  for (const line of dataLines) {
    lines.push(`data: ${line}`);
  }

  return lines.join('\n') + '\n\n';
}

export function encodeSSEMessage<T>(event: SSEEvent<T>): Uint8Array {
  return TEXT_ENCODER.encode(formatSSEMessage(event));
}

export function getMessageSize<T>(event: SSEEvent<T>): number {
  return encodeSSEMessage(event).byteLength;
}

// =============================================================================
// SSE STREAM CREATION
// =============================================================================

export function createSSEStream(
  options: SSEConnectionOptions = {}
): {
  stream: ReadableStream<Uint8Array>;
  send: <T>(event: SSEEvent<T>) => boolean;
  close: () => void;
  getStats: () => { messageCount: number; bytesTransferred: number };
} {
  const {
    heartbeatInterval = DEFAULT_HEARTBEAT_INTERVAL,
    retryInterval = DEFAULT_RETRY_INTERVAL,
    onClose,
    onError,
  } = options;

  let controllerRef: ReadableStreamDefaultController<Uint8Array>;
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let isOpen = true;
  let messageCount = 0;
  let bytesTransferred = 0;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;

      try {
        const initialMessage = encodeSSEMessage({
          event: 'connected',
          data: { 
            message: 'SSE connection established',
            timestamp: new Date().toISOString(),
          },
          retry: retryInterval,
        });
        controller.enqueue(initialMessage);
        messageCount++;
        bytesTransferred += initialMessage.byteLength;
      } catch (error) {
        log.error('Failed to send initial SSE message', {}, error);
      }

      heartbeatTimer = setInterval(() => {
        if (!isOpen) {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
          return;
        }

        try {
          const heartbeat = encodeSSEMessage({
            event: 'heartbeat',
            data: { timestamp: new Date().toISOString() },
          });
          controller.enqueue(heartbeat);
          messageCount++;
          bytesTransferred += heartbeat.byteLength;
        } catch (error) {
          log.debug('Heartbeat failed, connection may be closed by client', { error });
          isOpen = false;
          if (heartbeatTimer) clearInterval(heartbeatTimer);
        }
      }, heartbeatInterval);
    },

    cancel(reason) {
      log.debug('SSE stream cancelled', { reason });
      isOpen = false;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      onClose?.();
    },
  });

  const send = <T>(event: SSEEvent<T>): boolean => {
    if (!isOpen || !controllerRef) {
      log.warn('Attempted to send on closed SSE stream');
      return false;
    }

    try {
      const encoded = encodeSSEMessage(event);
      controllerRef.enqueue(encoded);
      messageCount++;
      bytesTransferred += encoded.byteLength;
      return true;
    } catch (error) {
      log.error('Failed to send SSE message', { event: event.event }, error);
      onError?.(error instanceof Error ? error : new Error('Send failed'));
      return false;
    }
  };

  const close = () => {
    if (!isOpen) return;
    
    isOpen = false;
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    
    try {
      controllerRef?.enqueue(encodeSSEMessage({
        event: 'close',
        data: { 
          message: 'Connection closed by server',
          timestamp: new Date().toISOString(),
        },
      }));
      controllerRef?.close();
    } catch {
      // Ignore errors during close
    }
    
    onClose?.();
  };

  const getStats = () => ({ messageCount, bytesTransferred });

  return { stream, send, close, getStats };
}

// =============================================================================
// SSE RESPONSE HEADERS
// =============================================================================

export function getSSEHeaders(additionalHeaders: Record<string, string> = {}): Headers {
  return new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Last-Event-ID',
    'Access-Control-Allow-Credentials': 'true',
    ...additionalHeaders,
  });
}

// =============================================================================
// SSE EVENT TYPES
// =============================================================================

export const SSEEventTypes = {
  // Connection events
  CONNECTED: 'connected',
  HEARTBEAT: 'heartbeat',
  CLOSE: 'close',
  ERROR: 'error',
  RECONNECT: 'reconnect',

  // Notification events
  NOTIFICATION: 'notification',
  NOTIFICATION_CREATED: 'notification:created',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_DELETED: 'notification:deleted',
  NOTIFICATION_COUNT: 'notification:count',
  NOTIFICATION_BATCH: 'notification:batch',
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',
  GOAL_COMPLETED: 'goal:completed',
  GOAL_REMINDER: 'goal:reminder',
  GOAL_PROGRESS: 'goal:progress',
  STREAK_ALERT: 'streak:alert',
  STREAK_MILESTONE: 'streak:milestone',
  STREAK_BROKEN: 'streak:broken',

  // Sync events
  SYNC_STARTED: 'sync:started',
  SYNC_PROGRESS: 'sync:progress',
  SYNC_COMPLETED: 'sync:completed',
  SYNC_FAILED: 'sync:failed',
  SYNC_PARTIAL: 'sync:partial',
  SYNC_CANCELLED: 'sync:cancelled',
  SYNC_QUEUED: 'sync:queued',
  PLATFORM_SYNCED: 'platform:synced',
  PLATFORM_ERROR: 'platform:error',
  PLATFORM_CONNECTED: 'platform:connected',
  PLATFORM_DISCONNECTED: 'platform:disconnected',

  // Analytics events
  ANALYTICS_UPDATE: 'analytics:update',
  STATS_REFRESH: 'stats:refresh',
  LEADERBOARD_UPDATE: 'leaderboard:update',

  // System events
  SYSTEM_MESSAGE: 'system:message',
  MAINTENANCE: 'maintenance',
  MAINTENANCE_START: 'maintenance:start',
  MAINTENANCE_END: 'maintenance:end',
  FEATURE_UPDATE: 'feature:update',
  VERSION_UPDATE: 'version:update',
} as const;

export type SSEEventType = typeof SSEEventTypes[keyof typeof SSEEventTypes];

// =============================================================================
// SSE EVENT PAYLOADS
// =============================================================================

export interface SSENotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;
  actionLabel?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  expiresAt?: string;
}

export interface SSENotificationCountPayload {
  unreadCount: number;
  totalCount: number;
  byType?: Record<string, number>;
}

export interface SSESyncProgressPayload {
  syncId: string;
  platformId?: string;
  platformName?: string;
  status: 'queued' | 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  itemsProcessed: number;
  totalItems: number;
  currentItem?: string;
  message?: string;
  startedAt: string;
  estimatedCompletion?: string;
  errors?: string[];
}

export interface SSESyncCompletedPayload {
  syncId: string;
  platformId?: string;
  platformName?: string;
  status: 'success' | 'partial' | 'failed';
  itemsCreated: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsFailed: number;
  duration: number;
  message?: string;
  completedAt: string;
  nextSyncAt?: string;
  stats?: Record<string, number>;
}

export interface SSEAchievementPayload {
  id: string;
  achievementId: string;
  title: string;
  description: string;
  tier: string;
  points: number;
  xpReward?: number;
  icon?: string;
  badgeImage?: string;
  rarity?: string;
  unlockedAt: string;
}

export interface SSEGoalPayload {
  id: string;
  title: string;
  progress: number;
  target: number;
  progressPercentage: number;
  status: string;
  deadline?: string;
  completedAt?: string;
  daysRemaining?: number;
}

export interface SSEStreakPayload {
  currentStreak: number;
  longestStreak: number;
  previousStreak?: number;
  status: 'at_risk' | 'broken' | 'milestone' | 'saved' | 'extended';
  message: string;
  milestone?: number;
  nextMilestone?: number;
  freezesRemaining?: number;
}

export interface SSEAnalyticsPayload {
  type: 'daily' | 'weekly' | 'monthly' | 'realtime';
  period?: {
    start: string;
    end: string;
  };
  metrics: Record<string, number>;
  changes?: Record<string, {
    value: number;
    change: number;
    changePercent: number;
  }>;
  timestamp: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function parseLastEventId(lastEventId: string | null): {
  timestamp: number;
  sequence: string;
} | null {
  if (!lastEventId) return null;

  const parts = lastEventId.split('-');
  if (parts.length !== 2) return null;

  const timestamp = parseInt(parts[0], 10);
  if (isNaN(timestamp)) return null;

  return { timestamp, sequence: parts[1] };
}

export function isValidChannel(channel: string): boolean {
  const validChannels = ['notifications', 'sync', 'analytics', 'system'];
  return validChannels.includes(channel);
}

export function sanitizeSSEData<T>(data: T): T {
  if (typeof data === 'string') {
    return data.replace(/[\r\n]/g, ' ') as T;
  }
  return data;
}

// =============================================================================
// EXPORTS
// =============================================================================

const sseexports = {
  formatSSEMessage,
  encodeSSEMessage,
  getMessageSize,
  createSSEStream,
  getSSEHeaders,
  SSEEventTypes,
  generateEventId,
  parseLastEventId,
  isValidChannel,
  sanitizeSSEData,
  DEFAULT_HEARTBEAT_INTERVAL,
  DEFAULT_RETRY_INTERVAL,
  DEFAULT_MAX_CONNECTIONS_PER_USER,
};
export default sseexports;