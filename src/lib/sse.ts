// src/lib/sse.ts
/**
 * Server-Sent Events (SSE) utilities
 * For real-time notifications and sync updates
 */

import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

export interface SSEMessage {
  id?: string;
  event?: string;
  data: unknown;
  retry?: number;
}

export interface SSEClient {
  id: string;
  userId: string;
  controller: ReadableStreamDefaultController;
  createdAt: Date;
  lastPingAt: Date;
}

export type SSEEventType = 
  | 'notification'
  | 'sync_started'
  | 'sync_progress'
  | 'sync_completed'
  | 'sync_failed'
  | 'achievement_unlocked'
  | 'goal_progress'
  | 'streak_update'
  | 'ping';

// =============================================================================
// SSE MANAGER
// =============================================================================

class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private pingTimer: NodeJS.Timeout | null = null;
  private readonly log = logger.child({ service: 'sse' });

  constructor() {
    this.startPingInterval();
  }

  /**
   * Create SSE response stream
   */
  createStream(
    userId: string,
    onClose?: () => void
  ): { stream: ReadableStream; clientId: string } {
    const clientId = crypto.randomUUID();
    
    const stream = new ReadableStream({
      start: (controller) => {
        const client: SSEClient = {
          id: clientId,
          userId,
          controller,
          createdAt: new Date(),
          lastPingAt: new Date(),
        };

        this.clients.set(clientId, client);

        this.log.info('SSE client connected', {
          clientId,
          userId,
          totalClients: this.clients.size,
        });

        // Send initial connection message
        this.sendToClient(clientId, {
          event: 'connected',
          data: { clientId, timestamp: new Date().toISOString() },
        });
      },
      cancel: () => {
        this.removeClient(clientId);
        onClose?.();
      },
    });

    return { stream, clientId };
  }

  /**
   * Send message to a specific client
   */
  sendToClient(clientId: string, message: SSEMessage): boolean {
    const client = this.clients.get(clientId);
    
    if (!client) {
      return false;
    }

    try {
      const formattedMessage = this.formatMessage(message);
      client.controller.enqueue(new TextEncoder().encode(formattedMessage));
      return true;
    } catch (error) {
      this.log.error('Failed to send SSE message', { clientId }, error);
      this.removeClient(clientId);
      return false;
    }
  }

  /**
   * Send message to all clients for a user
   */
  sendToUser(userId: string, message: SSEMessage): number {
    let sentCount = 0;

    for (const [clientId, client] of this.clients) {
      if (client.userId === userId) {
        if (this.sendToClient(clientId, message)) {
          sentCount++;
        }
      }
    }

    return sentCount;
  }

  /**
   * Send message to all connected clients
   */
  broadcast(message: SSEMessage): number {
    let sentCount = 0;

    for (const clientId of this.clients.keys()) {
      if (this.sendToClient(clientId, message)) {
        sentCount++;
      }
    }

    return sentCount;
  }

  /**
   * Remove a client
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    
    if (client) {
      try {
        client.controller.close();
      } catch {
        // Controller might already be closed
      }

      this.clients.delete(clientId);

      this.log.info('SSE client disconnected', {
        clientId,
        userId: client.userId,
        totalClients: this.clients.size,
      });
    }
  }

  /**
   * Get connected client count for a user
   */
  getClientCount(userId?: string): number {
    if (!userId) {
      return this.clients.size;
    }

    let count = 0;
    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        count++;
      }
    }
    return count;
  }

  /**
   * Check if user has connected clients
   */
  isUserConnected(userId: string): boolean {
    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        return true;
      }
    }
    return false;
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private formatMessage(message: SSEMessage): string {
    let result = '';

    if (message.id) {
      result += `id: ${message.id}\n`;
    }

    if (message.event) {
      result += `event: ${message.event}\n`;
    }

    if (message.retry) {
      result += `retry: ${message.retry}\n`;
    }

    const data = typeof message.data === 'string'
      ? message.data
      : JSON.stringify(message.data);

    result += `data: ${data}\n\n`;

    return result;
  }

  private startPingInterval(): void {
    this.pingTimer = setInterval(() => {
      const now = new Date();

      for (const [clientId, client] of this.clients) {
        // Check if client is stale (no ping response in 2 minutes)
        const timeSinceLastPing = now.getTime() - client.lastPingAt.getTime();
        
        if (timeSinceLastPing > 120000) {
          this.log.warn('Removing stale SSE client', { clientId });
          this.removeClient(clientId);
          continue;
        }

        // Send ping
        this.sendToClient(clientId, {
          event: 'ping',
          data: { timestamp: now.toISOString() },
        });

        client.lastPingAt = now;
      }
    }, this.PING_INTERVAL);
  }

  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
    }

    for (const clientId of this.clients.keys()) {
      this.removeClient(clientId);
    }
  }
}

// =============================================================================
// SINGLETON & EXPORTS
// =============================================================================

export const sseManager = new SSEManager();

/**
 * Create SSE response for Next.js API route
 */
export function createSSEResponse(
  userId: string,
  onClose?: () => void
): Response {
  const { stream } = sseManager.createStream(userId, onClose);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * Send notification to user
 */
export function sendNotification(
  userId: string,
  notification: {
    type: string;
    title: string;
    message: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
  }
): number {
  return sseManager.sendToUser(userId, {
    event: 'notification',
    data: {
      ...notification,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Send sync update to user
 */
export function sendSyncUpdate(
  userId: string,
  update: {
    status: 'started' | 'progress' | 'completed' | 'failed';
    platformId?: string;
    platformName?: string;
    progress?: number;
    message?: string;
    error?: string;
  }
): number {
  const eventMap = {
    started: 'sync_started',
    progress: 'sync_progress',
    completed: 'sync_completed',
    failed: 'sync_failed',
  };

  return sseManager.sendToUser(userId, {
    event: eventMap[update.status],
    data: {
      ...update,
      timestamp: new Date().toISOString(),
    },
  });
}

export const sse = {
  manager: sseManager,
  createResponse: createSSEResponse,
  sendNotification,
  sendSyncUpdate,
};

export default sse;