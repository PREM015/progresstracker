import { httpClient } from '@/lib/http-client';
import { Platform, PlatformConnection, PlatformStats } from '@/types/platform';

const BASE_URL = '/platforms';

export const PlatformService = {
    /**
     * Get all supported platforms
     */
    getAll: async (): Promise<Platform[]> => {
        const response = await httpClient.get<Platform[]>(`${BASE_URL}`);
        return response || [];
    },

    /**
     * Get user's connected platforms
     */
    getConnected: async (): Promise<PlatformConnection[]> => {
        const response = await httpClient.get<{ connections: PlatformConnection[] }>(`${BASE_URL}/connected`);
        return response?.connections || [];
    },

    /**
     * Get specific platform details
     */
    getById: async (id: string): Promise<Platform> => {
        return httpClient.get<Platform>(`${BASE_URL}/${id}`);
    },

    /**
     * Connect a platform
     */
    connect: async (platformId: string, data: Record<string, any>): Promise<PlatformConnection> => {
        return httpClient.post<PlatformConnection>(`${BASE_URL}/connect`, {
            platformId,
            ...data,
        });
    },

    /**
     * Disconnect a platform
     */
    disconnect: async (platformId: string): Promise<void> => {
        await httpClient.post<void>(`${BASE_URL}/disconnect`, { platformId });
    },

    /**
     * Force sync a platform
     */
    sync: async (platformId: string): Promise<PlatformStats> => {
        return httpClient.post<PlatformStats>(`${BASE_URL}/${platformId}/sync`);
    },

    /**
     * Get platform sync logs
     */
    getSyncLogs: async (limit: number = 20): Promise<any[]> => {
        const response = await httpClient.get<{ logs: any[] }>(`${BASE_URL}/logs`, { params: { limit } });
        return (response?.logs || []).map(log => ({
            ...log,
            timestamp: new Date(log.createdAt),
            startedAt: log.startedAt ? new Date(log.startedAt) : undefined,
            completedAt: log.completedAt ? new Date(log.completedAt) : undefined,
        }));
    },
};
