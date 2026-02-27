import { httpClient } from '@/lib/http-client';
import type {
    Notification,
    NotificationPreferences,
    NotificationFilter,
} from '@/types/notification';

// =============================================================================
// TYPES
// =============================================================================

export interface PaginatedNotifications {
    items: Notification[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

// =============================================================================
// SERVICE
// =============================================================================

export const NotificationService = {
    /**
     * Get paginated notifications
     */
    getList: async (
        filters: NotificationFilter = {},
        page: number = 1,
        limit: number = 20
    ): Promise<PaginatedNotifications> => {
        const params: Record<string, string> = {
            page: String(page),
            limit: String(limit),
        };

        if (filters.type) {
            params.type = Array.isArray(filters.type) ? filters.type.join(',') : filters.type;
        }
        if (filters.isRead !== undefined) params.isRead = String(filters.isRead);
        if (filters.isArchived !== undefined) params.isArchived = String(filters.isArchived);

        const response = await httpClient.get<PaginatedNotifications>('/api/notifications', { params });
        return response;
    },

    /**
     * Get unread count
     */
    getUnreadCount: async (): Promise<number> => {
        const response = await httpClient.get<{ count: number }>('/api/notifications/unread-count');
        return response.count;
    },

    /**
     * Get notification preferences
     */
    getPreferences: async (): Promise<NotificationPreferences> => {
        const response = await httpClient.get<{ preferences: NotificationPreferences }>(
            '/api/notifications/preferences'
        );
        return response.preferences;
    },

    /**
     * Mark notification(s) as read
     */
    markAsRead: async (ids: string | string[]): Promise<void> => {
        const idsArray = Array.isArray(ids) ? ids : [ids];
        await httpClient.post('/api/notifications/mark-read', { ids: idsArray });
    },

    /**
     * Mark all notifications as read
     */
    markAllAsRead: async (): Promise<void> => {
        await httpClient.post('/api/notifications/mark-all-read');
    },

    /**
     * Archive notification
     */
    archive: async (id: string): Promise<void> => {
        await httpClient.post(`/api/notifications/${id}/archive`);
    },

    /**
     * Delete notification
     */
    delete: async (id: string): Promise<void> => {
        await httpClient.delete(`/api/notifications/${id}`);
    },

    /**
     * Dismiss notification
     */
    dismiss: async (id: string): Promise<void> => {
        await httpClient.post(`/api/notifications/${id}/dismiss`);
    },

    /**
     * Update notification preferences
     */
    updatePreferences: async (data: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
        const response = await httpClient.put<{ preferences: NotificationPreferences }>(
            '/api/notifications/preferences',
            data
        );
        return response.preferences;
    },
};
