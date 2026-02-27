// src/hooks/useUnreadCount.ts
// Global SWR hook for notification unread count
// - 30s polling interval (single global poller)
// - Deduplicates across all components
'use client';

import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { httpClient } from '@/lib/http-client';

const fetcher = async (): Promise<number> => {
    const res = await httpClient.get<{ count: number }>('/api/notifications/unread-count');
    return res.count ?? 0;
};

/**
 * Single global hook for unread notification count.
 * - 30s polling interval (only one poller regardless of how many components use this)
 * - Dedup prevents duplicate requests within 15s
 * - Does NOT re-fetch on focus to prevent spam
 */
export function useUnreadCount() {
    const { status } = useSession();
    const isAuthenticated = status === 'authenticated';

    const { data, error, mutate } = useSWR<number>(
        isAuthenticated ? '/api/notifications/unread-count' : null,
        fetcher,
        {
            refreshInterval: 30_000,    // Poll every 30 seconds
            dedupingInterval: 15_000,   // 15s dedup window
            revalidateOnFocus: false,   // Don't spam on tab switch
            revalidateOnReconnect: true,
            errorRetryCount: 2,
        }
    );

    return {
        unreadCount: data ?? 0,
        error,
        /** Call after marking notifications as read to instantly update the count */
        invalidate: () => mutate(),
    };
}
