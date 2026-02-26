import { httpClient } from '@/lib/http-client';
import { User, UserSettings, UserProfile } from '@/types/user';

const BASE_URL = '/user';

export const UserService = {
    /**
     * Get current user profile
     */
    getProfile: async (options?: { lean?: boolean }): Promise<User> => {
        const query = options?.lean ? '?lean=true' : '';
        const data = await httpClient.get<{ user: User }>(`${BASE_URL}/profile${query}`);
        if (!data?.user) throw new Error('User profile missing');
        return data.user;
    },

    /**
     * Update user profile
     */
    updateProfile: async (data: Partial<UserProfile>): Promise<User> => {
        const response = await httpClient.patch<{ user: User }>(`${BASE_URL}/profile`, data);
        if (!response?.user) throw new Error('User profile missing');
        return response.user;
    },

    /**
     * Get user settings
     */
    getSettings: async (): Promise<UserSettings> => {
        const response = await httpClient.get<{ settings: UserSettings }>(`${BASE_URL}/settings`);
        if (!response?.settings) throw new Error('Settings missing');
        return response.settings;
    },

    /**
     * Update user settings
     */
    updateSettings: async (data: Partial<UserSettings>): Promise<UserSettings> => {
        const response = await httpClient.patch<{ settings: UserSettings }>(`${BASE_URL}/settings`, data);
        if (!response?.settings) throw new Error('Settings missing');
        return response.settings;
    },

    /**
     * Delete account
     */
    deleteAccount: async (): Promise<void> => {
        await httpClient.delete<void>(`${BASE_URL}/account`);
    },

    /**
     * Get login history
     */
    getLoginHistory: async (): Promise<any[]> => {
        const response = await httpClient.get<any[]>(`${BASE_URL}/login-history`);
        return response || [];
    },

    /**
     * Trigger data export
     */
    exportData: async (): Promise<void> => {
        await httpClient.get<void>(`${BASE_URL}/export-data`);
    },

    /**
     * Get webhooks
     */
    getWebhooks: async (): Promise<any[]> => {
        const response = await httpClient.get<any[]>(`${BASE_URL}/webhooks`);
        return response || [];
    },

    /**
     * Create webhook
     */
    createWebhook: async (data: any): Promise<any> => {
        const response = await httpClient.post<any>(`${BASE_URL}/webhooks`, data);
        return response;
    },

    /**
     * Delete webhook
     */
    deleteWebhook: async (id: string): Promise<void> => {
        await httpClient.delete<void>(`${BASE_URL}/webhooks/${id}`);
    },

    /**
     * Get connected accounts (e.g. OAuth)
     */
    getConnectedAccounts: async (): Promise<any[]> => {
        const response = await httpClient.get<any[]>(`${BASE_URL}/connected-accounts`);
        return response || [];
    }
};
