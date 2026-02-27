// src/lib/websocket.ts
/**
 * WebSocket client utilities
 * Real-time bidirectional communication
 */

import { logger } from './logger';

// =============================================================================
// TYPES
// =============================================================================

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: string;
  id?: string;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
}

type MessageHandler<T = unknown> = (payload: T, message: WebSocketMessage<T>) => void;

// =============================================================================
// WEBSOCKET CLIENT
// =============================================================================

class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig | null = null;
  private status: WebSocketStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private pendingMessages: WebSocketMessage[] = [];
  private readonly log = logger.child({ service: 'websocket' });

  /**
   * Connect to WebSocket server
   */
  connect(config: WebSocketConfig): void {
    this.config = {
      reconnect: true,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...config,
    };

    this.doConnect();
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.stopReconnect();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.status = 'disconnected';
    this.log.info('WebSocket disconnected');
  }

  /**
   * Send a message
   */
  send<T>(type: string, payload: T): boolean {
    const message: WebSocketMessage<T> = {
      type,
      payload,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID(),
    };

    if (this.status !== 'connected' || !this.ws) {
      // Queue message for later
      this.pendingMessages.push(message as WebSocketMessage);
      this.log.debug('Message queued (not connected)', { type });
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      this.log.debug('Message sent', { type, id: message.id });
      return true;
    } catch (error) {
      this.log.error('Failed to send message', { type }, error);
      this.pendingMessages.push(message as WebSocketMessage);
      return false;
    }
  }

  /**
   * Subscribe to message type
   */
  subscribe<T = unknown>(type: string, handler: MessageHandler<T>): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    this.messageHandlers.get(type)!.add(handler as MessageHandler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler as MessageHandler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(type);
        }
      }
    };
  }

  /**
   * Subscribe to message type (one-time)
   */
  once<T = unknown>(type: string, handler: MessageHandler<T>): () => void {
    const wrappedHandler: MessageHandler<T> = (payload, message) => {
      unsubscribe();
      handler(payload, message);
    };

    const unsubscribe = this.subscribe(type, wrappedHandler);
    return unsubscribe;
  }

  /**
   * Get current status
   */
  getStatus(): WebSocketStatus {
    return this.status;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.status === 'connected';
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private doConnect(): void {
    if (!this.config) return;

    this.status = 'connecting';
    this.log.info('Connecting to WebSocket', { url: this.config.url });

    try {
      this.ws = new WebSocket(this.config.url, this.config.protocols);
      this.setupEventListeners();
    } catch (error) {
      this.log.error('Failed to create WebSocket', {}, error);
      this.status = 'error';
      this.scheduleReconnect();
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.status = 'connected';
      this.reconnectAttempts = 0;
      this.log.info('WebSocket connected');

      // Start heartbeat
      this.startHeartbeat();

      // Send pending messages
      this.flushPendingMessages();

      this.config?.onOpen?.();
    };

    this.ws.onclose = (event) => {
      this.status = 'disconnected';
      this.stopHeartbeat();

      this.log.info('WebSocket closed', {
        code: event.code,
        reason: event.reason,
      });

      this.config?.onClose?.(event);

      // Attempt reconnect
      if (event.code !== 1000 && this.config?.reconnect) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (event) => {
      this.status = 'error';
      this.log.error('WebSocket error', {}, event);
      this.config?.onError?.(event);
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        this.log.error('Failed to parse WebSocket message', {}, error);
      }
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    this.log.debug('Message received', { type: message.type, id: message.id });

    // Handle pong (heartbeat response)
    if (message.type === 'pong') {
      return;
    }

    // Call registered handlers
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(message.payload, message);
        } catch (error) {
          this.log.error('Message handler error', { type: message.type }, error);
        }
      }
    }

    // Call global handler
    this.config?.onMessage?.(message);
  }

  private startHeartbeat(): void {
    if (!this.config?.heartbeatInterval) return;

    this.heartbeatTimer = setInterval(() => {
      if (this.status === 'connected') {
        this.send('ping', { timestamp: Date.now() });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (!this.config?.reconnect) return;
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 10)) {
      this.log.warn('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval || 5000;

    this.log.info('Scheduling reconnect', {
      attempt: this.reconnectAttempts,
      delay,
    });

    this.reconnectTimer = setTimeout(() => {
      this.doConnect();
    }, delay);
  }

  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  private flushPendingMessages(): void {
    if (this.pendingMessages.length === 0) return;

    this.log.info('Flushing pending messages', {
      count: this.pendingMessages.length,
    });

    const messages = [...this.pendingMessages];
    this.pendingMessages = [];

    for (const message of messages) {
      if (this.ws && this.status === 'connected') {
        try {
          this.ws.send(JSON.stringify(message));
        } catch {
          this.pendingMessages.push(message);
        }
      } else {
        this.pendingMessages.push(message);
      }
    }
  }
}

// =============================================================================
// SINGLETON & EXPORTS
// =============================================================================

export const websocket = new WebSocketClient();

/**
 * Create a new WebSocket client instance
 */
export function createWebSocketClient(): WebSocketClient {
  return new WebSocketClient();
}

export default websocket;