'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { SSEEventTypes, SSENotificationPayload, SSENotificationCountPayload } from '@/lib/sse';
import { NotificationService } from '@/services/api/notification.service';

/**
 * Realtime Context
 * 
 * @description Provides realtime state and actions across the app via SSE
 * @created 2026-02-15
 */

interface RealtimeState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  unreadCount: number;
}

interface RealtimeActions {
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

interface RealtimeContextValue extends RealtimeState, RealtimeActions { }

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

interface RealtimeProviderProps {
  children: ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { data: session, status } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch initial count
  const fetchInitialCount = useCallback(async () => {
    try {
      const count = await NotificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch unread count', err);
    }
  }, []);

  // Connect to SSE
  const connect = useCallback(() => {
    if (status !== 'authenticated' || eventSourceRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // Connect to the specific notifications endpoint
      const es = new EventSource('/api/sse/notifications');
      eventSourceRef.current = es;

      es.onopen = () => {
        console.log('SSE Connected');
        setIsConnected(true);
        setIsLoading(false);
        setError(null);
      };

      es.onerror = (e) => {
        console.error('SSE Error', e);
        setIsConnected(false);
        setIsLoading(false);
        // EventSource automatically retries, but we track state
        if (es.readyState === EventSource.CLOSED) {
          setError('Connection lost');
        }
      };

      // Listen for specific events

      // 1. New Notification
      es.addEventListener(SSEEventTypes.NOTIFICATION, (e) => {
        const event = e as MessageEvent;
        try {
          const data = JSON.parse(event.data) as SSENotificationPayload;
          toast(data.title, { description: data.message });
          setUnreadCount(prev => prev + 1);
        } catch (err) {
          console.error('Failed to parse notification event', err);
        }
      });

      // 2. Notification Count Update
      es.addEventListener(SSEEventTypes.NOTIFICATION_COUNT, (e) => {
        const event = e as MessageEvent;
        try {
          const data = JSON.parse(event.data) as SSENotificationCountPayload;
          setUnreadCount(data.unreadCount);
        } catch (err) {
          console.error('Failed to parse count event', err);
        }
      });

      // 3. Achievement Unlocked
      es.addEventListener(SSEEventTypes.ACHIEVEMENT_UNLOCKED, (e) => {
        const event = e as MessageEvent;
        try {
          // We can type this properly later, for now just toast
          const data = JSON.parse(event.data);
          toast.success(`Achievement Unlocked: ${data.title}`, {
            description: data.description,
            duration: 5000,
          });
          // Maybe trigger confetti here?
        } catch (err) {
          console.error('Failed to parse achievement event', err);
        }
      });

    } catch (err) {
      console.error('Failed to setup SSE', err);
      setError('Failed to connect to realtime service');
      setIsLoading(false);
    }
  }, [status]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      console.log('SSE Disconnected');
    }
  }, []);

  // Lifecycle
  useEffect(() => {
    if (status === 'authenticated') {
      fetchInitialCount();
      connect();
    } else if (status === 'unauthenticated') {
      disconnect();
      setUnreadCount(0);
      setIsLoading(false);
    }

    return () => {
      disconnect();
    };
  }, [status, connect, disconnect, fetchInitialCount]);

  // Actions
  const refresh = useCallback(async () => {
    disconnect();
    await fetchInitialCount();
    connect();
  }, [disconnect, fetchInitialCount, connect]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await NotificationService.markAsRead(id);
      // Optimistic update
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await NotificationService.markAllAsRead();
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  }, []);

  const value: RealtimeContextValue = {
    isConnected,
    isLoading,
    error,
    unreadCount,
    refresh,
    markAsRead,
    markAllAsRead
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);

  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }

  return context;
}

export default RealtimeContext;
