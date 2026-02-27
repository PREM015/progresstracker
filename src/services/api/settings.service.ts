import { httpClient } from '@/lib/http-client';

// =============================================================================
// TYPES
// =============================================================================

export interface UserSettings {
    // Appearance
    theme: 'light' | 'dark' | 'system';
    accentColor: string;
    compactMode: boolean;
    fontSize: 'small' | 'medium' | 'large';
    reducedMotion: boolean;
    highContrast: boolean;

    // Localization
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    weekStartsOn: number;
    numberFormat: string;

    // Sync Preferences
    autoSync: boolean;
    syncFrequency: 'realtime' | 'hourly' | 'daily' | 'manual';
    syncOnLogin: boolean;
    syncInBackground: boolean;

    // Privacy
    publicProfile: boolean;
    showInLeaderboard: boolean;
    allowAnalytics: boolean;
    allowCookies: boolean;

    // Dashboard
    dashboardLayout: Record<string, unknown> | null;
    defaultDateRange: string;
    showWelcomeBanner: boolean;

    // Features
    keyboardShortcuts: boolean;
    soundEffects: boolean;
    desktopNotifications: boolean;

    // Data
    dataRetentionDays: number;
}

// =============================================================================
// SERVICE
// =============================================================================

export const SettingsService = {
    /**
     * Get user settings
     */
    get: async (): Promise<UserSettings> => {
        const response = await httpClient.get<{ settings: UserSettings }>('/api/user/settings');
        return response.settings;
    },

    /**
     * Update user settings
     */
    update: async (data: Partial<UserSettings>): Promise<UserSettings> => {
        const response = await httpClient.put<{ settings: UserSettings }>('/api/user/settings', data);
        return response.settings;
    },

    /**
     * Reset settings to default
     */
    reset: async (): Promise<UserSettings> => {
        const response = await httpClient.post<{ settings: UserSettings }>('/api/user/settings/reset');
        return response.settings;
    },
};
