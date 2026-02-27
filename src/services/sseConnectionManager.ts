// src/services/sseConnectionManager.ts
/**
 * SSE Connection Manager
 * Complete connection management with analytics
 */

import { logger } from '@/lib/logger';
import { 
  SSEClient, 
  SSEEvent, 
  SSEConnectionStats,
  encodeSSEMessage, 
  generateEventId,
  SSEEventTypes,
} from '@/lib/sse';

// =============================================================================
// TYPES
// =============================================================================

export interface ConnectionManagerStats {
  totalConnections: number;
  activeConnections: number;
  connectionsByChannel: Record<string, number>;
  connectionsByUser: Record<string, number>;
  uniqueUsers: number;
  totalMessagesSent: number;
  totalBytesTransferred: number;
  oldestConnection: Date | null;
  newestConnection: Date | null;
  averageConnectionDuration: number;
  peakConnections: number;
  peakConnectionsTime: Date | null;
}

export interface ConnectionAnalytics {
  hourlyConnections: Record<string, number>;
  dailyConnections: Record<string, number>;
  channelDistribution: Record<string, number>;
  messagesByChannel: Record<string, number>;
  errorRate: number;
  averageMessagesPerConnection: number;
}

// =============================================================================
// CONNECTION MANAGER
// =============================================================================

const log = logger.child({ service: 'SSEConnectionManager' });

const MAX_CONNECTIONS_PER_USER = 5;
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

class SSEConnectionManager {
  private connections: Map<string, SSEClient> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private channelConnections: Map<string, Set<string>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // Analytics
  private totalMessagesSent: number = 0;
  private totalBytesTransferred: number = 0;
  private totalConnectionsCreated: number = 0;
  private connectionErrors: number = 0;
  private peakConnections: number = 0;
  private peakConnectionsTime: Date | null = null;
  private hourlyStats: Map<string, number> = new Map();
  private dailyStats: Map<string, number> = new Map();

  constructor() {
    this.startCleanupInterval();
  }

  // ===========================================================================
  // CONNECTION MANAGEMENT
  // ===========================================================================

  /**
   * Add a new SSE connection
   */
  addConnection(client: SSEClient): { success: boolean; error?: string } {
    // Check user connection limit
    const userConns = this.userConnections.get(client.userId);
    if (userConns && userConns.size >= MAX_CONNECTIONS_PER_USER) {
      log.warn('User connection limit reached', { 
        userId: client.userId, 
        limit: MAX_CONNECTIONS_PER_USER 
      });
      return { 
        success: false, 
        error: `Maximum ${MAX_CONNECTIONS_PER_USER} connections per user allowed` 
      };
    }

    // Store connection
    this.connections.set(client.id, client);

    // Add to user connections
    if (!this.userConnections.has(client.userId)) {
      this.userConnections.set(client.userId, new Set());
    }
    this.userConnections.get(client.userId)!.add(client.id);

    // Add to channel connections
    if (!this.channelConnections.has(client.channel)) {
      this.channelConnections.set(client.channel, new Set());
    }
    this.channelConnections.get(client.channel)!.add(client.id);

    // Update analytics
    this.totalConnectionsCreated++;
    this.updateHourlyStats();
    this.updateDailyStats();

    // Track peak connections
    if (this.connections.size > this.peakConnections) {
      this.peakConnections = this.connections.size;
      this.peakConnectionsTime = new Date();
    }

    log.info('SSE connection added', {
      clientId: client.id,
      userId: client.userId,
      channel: client.channel,
      totalConnections: this.connections.size,
    });

    return { success: true };
  }

  /**
   * Remove an SSE connection
   */
  removeConnection(clientId: string): SSEClient | null {
    const client = this.connections.get(clientId);
    if (!client) return null;

    // Update stats before removing
    this.totalMessagesSent += client.messageCount;
    this.totalBytesTransferred += client.bytesTransferred;

    // Remove from maps
    this.connections.delete(clientId);

    const userConns = this.userConnections.get(client.userId);
    if (userConns) {
      userConns.delete(clientId);
      if (userConns.size === 0) {
        this.userConnections.delete(client.userId);
      }
    }

    const channelConns = this.channelConnections.get(client.channel);
    if (channelConns) {
      channelConns.delete(clientId);
      if (channelConns.size === 0) {
        this.channelConnections.delete(client.channel);
      }
    }

    log.info('SSE connection removed', {
      clientId,
      userId: client.userId,
      channel: client.channel,
      duration: Date.now() - client.createdAt.getTime(),
      messageCount: client.messageCount,
      totalConnections: this.connections.size,
    });

    return client;
  }

  /**
   * Get connection by ID
   */
  getConnection(clientId: string): SSEClient | undefined {
    return this.connections.get(clientId);
  }

  /**
   * Get connection stats by ID
   */
  getConnectionStats(clientId: string): SSEConnectionStats | null {
    const client = this.connections.get(clientId);
    if (!client) return null;

    return {
      id: client.id,
      userId: client.userId,
      channel: client.channel,
      createdAt: client.createdAt,
      lastPing: client.lastPing,
      duration: Date.now() - client.createdAt.getTime(),
      messageCount: client.messageCount,
      bytesTransferred: client.bytesTransferred,
      metadata: client.metadata,
    };
  }

  /**
   * Get all connections for a user
   */
  getUserConnections(userId: string): SSEClient[] {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds) return [];

    return Array.from(connectionIds)
      .map(id => this.connections.get(id))
      .filter((c): c is SSEClient => c !== undefined);
  }

  /**
   * Get all connections for a channel
   */
  getChannelConnections(channel: string): SSEClient[] {
    const connectionIds = this.channelConnections.get(channel);
    if (!connectionIds) return [];

    return Array.from(connectionIds)
      .map(id => this.connections.get(id))
      .filter((c): c is SSEClient => c !== undefined);
  }

  /**
   * Get all connections
   */
  getAllConnections(): SSEClient[] {
    return Array.from(this.connections.values());
  }

  /**
   * Check if user has active connections
   */
  hasUserConnections(userId: string): boolean {
    const conns = this.userConnections.get(userId);
    return conns !== undefined && conns.size > 0;
  }

  /**
   * Update connection last ping
   */
  updateConnectionPing(clientId: string): boolean {
    const client = this.connections.get(clientId);
    if (!client) return false;
    client.lastPing = new Date();
    return true;
  }

  // ===========================================================================
  // MESSAGING
  // ===========================================================================

  /**
   * Send event to a specific connection
   */
  sendToConnection<T>(clientId: string, event: SSEEvent<T>): boolean {
    const client = this.connections.get(clientId);
    if (!client) return false;

    try {
      const eventWithId = {
        ...event,
        id: event.id || generateEventId(),
      };
      const encoded = encodeSSEMessage(eventWithId);
      client.controller.enqueue(encoded);
      client.lastPing = new Date();
      client.messageCount++;
      client.bytesTransferred += encoded.byteLength;
      return true;
    } catch (error) {
      log.error('Failed to send to connection', { clientId }, error);
      this.connectionErrors++;
      this.removeConnection(clientId);
      return false;
    }
  }

  /**
   * Send event to all connections for a user
   */
  sendToUser<T>(userId: string, event: SSEEvent<T>): { sent: number; failed: number } {
    const clients = this.getUserConnections(userId);
    let sent = 0;
    let failed = 0;

    for (const client of clients) {
      if (this.sendToConnection(client.id, event)) {
        sent++;
      } else {
        failed++;
      }
    }

    log.debug('Event sent to user', {
      userId,
      event: event.event,
      sent,
      failed,
    });

    return { sent, failed };
  }

  /**
   * Send event to all connections in a channel
   */
  sendToChannel<T>(channel: string, event: SSEEvent<T>): { sent: number; failed: number } {
    const clients = this.getChannelConnections(channel);
    let sent = 0;
    let failed = 0;

    for (const client of clients) {
      if (this.sendToConnection(client.id, event)) {
        sent++;
      } else {
        failed++;
      }
    }

    log.debug('Event sent to channel', {
      channel,
      event: event.event,
      sent,
      failed,
    });

    return { sent, failed };
  }

  /**
   * Broadcast event to all connections
   */
  broadcast<T>(event: SSEEvent<T>): { sent: number; failed: number } {
    let sent = 0;
    let failed = 0;

    for (const [clientId] of this.connections) {
      if (this.sendToConnection(clientId, event)) {
        sent++;
      } else {
        failed++;
      }
    }

    log.debug('Event broadcast', {
      event: event.event,
      sent,
      failed,
    });

    return { sent, failed };
  }

  /**
   * Send to multiple specific users
   */
  sendToUsers<T>(userIds: string[], event: SSEEvent<T>): { sent: number; failed: number; userResults: Record<string, { sent: number; failed: number }> } {
    let totalSent = 0;
    let totalFailed = 0;
    const userResults: Record<string, { sent: number; failed: number }> = {};

    for (const userId of userIds) {
      const result = this.sendToUser(userId, event);
      userResults[userId] = result;
      totalSent += result.sent;
      totalFailed += result.failed;
    }

    return { sent: totalSent, failed: totalFailed, userResults };
  }

  // ===========================================================================
  // STATISTICS & ANALYTICS
  // ===========================================================================

  /**
   * Get connection statistics
   */
  getStats(): ConnectionManagerStats {
    let totalDuration = 0;
    let oldestConnection: Date | null = null;
    let newestConnection: Date | null = null;

    for (const client of this.connections.values()) {
      totalDuration += Date.now() - client.createdAt.getTime();

      if (!oldestConnection || client.createdAt < oldestConnection) {
        oldestConnection = client.createdAt;
      }
      if (!newestConnection || client.createdAt > newestConnection) {
        newestConnection = client.createdAt;
      }
    }

    const connectionsByChannel: Record<string, number> = {};
    for (const [channel, ids] of this.channelConnections) {
      connectionsByChannel[channel] = ids.size;
    }

    const connectionsByUser: Record<string, number> = {};
    for (const [userId, ids] of this.userConnections) {
      connectionsByUser[userId] = ids.size;
    }

    return {
      totalConnections: this.connections.size,
      activeConnections: this.connections.size,
      connectionsByChannel,
      connectionsByUser,
      uniqueUsers: this.userConnections.size,
      totalMessagesSent: this.totalMessagesSent,
      totalBytesTransferred: this.totalBytesTransferred,
      oldestConnection,
      newestConnection,
      averageConnectionDuration: this.connections.size > 0 ? totalDuration / this.connections.size : 0,
      peakConnections: this.peakConnections,
      peakConnectionsTime: this.peakConnectionsTime,
    };
  }

  /**
   * Get detailed analytics
   */
  getAnalytics(): ConnectionAnalytics {
    const hourlyConnections: Record<string, number> = {};
    for (const [hour, count] of this.hourlyStats) {
      hourlyConnections[hour] = count;
    }

    const dailyConnections: Record<string, number> = {};
    for (const [day, count] of this.dailyStats) {
      dailyConnections[day] = count;
    }

    const channelDistribution: Record<string, number> = {};
    const messagesByChannel: Record<string, number> = {};

    for (const [channel, ids] of this.channelConnections) {
      channelDistribution[channel] = ids.size;
      messagesByChannel[channel] = 0;
      
      for (const id of ids) {
        const client = this.connections.get(id);
        if (client) {
          messagesByChannel[channel] += client.messageCount;
        }
      }
    }

    const totalConnections = this.totalConnectionsCreated || 1;
    const totalMessages = this.totalMessagesSent;

    return {
      hourlyConnections,
      dailyConnections,
      channelDistribution,
      messagesByChannel,
      errorRate: this.connectionErrors / totalConnections,
      averageMessagesPerConnection: totalMessages / totalConnections,
    };
  }

  /**
   * Get connection list with pagination
   */
  getConnectionList(options: {
    page?: number;
    limit?: number;
    channel?: string;
    userId?: string;
    sortBy?: 'createdAt' | 'lastPing' | 'messageCount';
    sortOrder?: 'asc' | 'desc';
  } = {}): {
    connections: SSEConnectionStats[];
    total: number;
    page: number;
    totalPages: number;
  } {
    const {
      page = 1,
      limit = 20,
      channel,
      userId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    let clients = Array.from(this.connections.values());

    // Filter
    if (channel) {
      clients = clients.filter(c => c.channel === channel);
    }
    if (userId) {
      clients = clients.filter(c => c.userId === userId);
    }

    // Sort
    clients.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'lastPing':
          comparison = a.lastPing.getTime() - b.lastPing.getTime();
          break;
        case 'messageCount':
          comparison = a.messageCount - b.messageCount;
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const total = clients.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedClients = clients.slice(startIndex, startIndex + limit);

    const connections = paginatedClients.map(c => ({
      id: c.id,
      userId: c.userId,
      channel: c.channel,
      createdAt: c.createdAt,
      lastPing: c.lastPing,
      duration: Date.now() - c.createdAt.getTime(),
      messageCount: c.messageCount,
      bytesTransferred: c.bytesTransferred,
      metadata: c.metadata,
    }));

    return { connections, total, page, totalPages };
  }

  // ===========================================================================
  // CLEANUP & MANAGEMENT
  // ===========================================================================

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, CLEANUP_INTERVAL);
  }

  private cleanupStaleConnections(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [clientId, client] of this.connections) {
      if (now - client.lastPing.getTime() > STALE_THRESHOLD) {
        try {
          client.controller.enqueue(encodeSSEMessage({
            event: SSEEventTypes.CLOSE,
            data: { reason: 'Connection timeout', timestamp: new Date().toISOString() },
          }));
          client.controller.close();
        } catch {
          // Ignore
        }

        this.removeConnection(clientId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      log.info('Cleaned up stale SSE connections', {
        removedCount,
        remainingConnections: this.connections.size,
      });
    }
  }

  private updateHourlyStats(): void {
    const hour = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
    this.hourlyStats.set(hour, (this.hourlyStats.get(hour) || 0) + 1);

    // Keep only last 24 hours
    if (this.hourlyStats.size > 24) {
      const oldestKey = Array.from(this.hourlyStats.keys())[0];
      this.hourlyStats.delete(oldestKey);
    }
  }

  private updateDailyStats(): void {
    const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    this.dailyStats.set(day, (this.dailyStats.get(day) || 0) + 1);

    // Keep only last 30 days
    if (this.dailyStats.size > 30) {
      const oldestKey = Array.from(this.dailyStats.keys())[0];
      this.dailyStats.delete(oldestKey);
    }
  }

  /**
   * Close specific connections
   */
  closeConnections(connectionIds: string[]): number {
    let closedCount = 0;

    for (const id of connectionIds) {
      const client = this.connections.get(id);
      if (client) {
        try {
          client.controller.enqueue(encodeSSEMessage({
            event: SSEEventTypes.CLOSE,
            data: { reason: 'Closed by admin', timestamp: new Date().toISOString() },
          }));
          client.controller.close();
        } catch {
          // Ignore
        }
        this.removeConnection(id);
        closedCount++;
      }
    }

    return closedCount;
  }

  /**
   * Close all connections for a user
   */
  closeUserConnections(userId: string): number {
    const clients = this.getUserConnections(userId);
    return this.closeConnections(clients.map(c => c.id));
  }

  /**
   * Close all connections in a channel
   */
  closeChannelConnections(channel: string): number {
    const clients = this.getChannelConnections(channel);
    return this.closeConnections(clients.map(c => c.id));
  }

  /**
   * Close all connections
   */
  closeAll(): number {
    log.info('Closing all SSE connections', {
      totalConnections: this.connections.size,
    });

    const allIds = Array.from(this.connections.keys());
    return this.closeConnections(allIds);
  }

  /**
   * Reset analytics
   */
  resetAnalytics(): void {
    this.totalMessagesSent = 0;
    this.totalBytesTransferred = 0;
    this.totalConnectionsCreated = 0;
    this.connectionErrors = 0;
    this.peakConnections = this.connections.size;
    this.peakConnectionsTime = new Date();
    this.hourlyStats.clear();
    this.dailyStats.clear();

    log.info('SSE analytics reset');
  }
}

export const sseConnectionManager = new SSEConnectionManager();
export default sseConnectionManager;