// ============================================================================
// FILE: src/hooks/useSettings.ts
// PURPOSE: User settings hook - preferences, appearance, privacy
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo } from 'react';
import { SettingsService } from '@/services/api/settings.service';
import { queryKeys } from './keys';

// =============================================================================
// TYPES
// =============================================================================

interface UserSettings {
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

interface PrivacySettings {
  isPublic: boolean;
  showEmail: boolean;
  showLocation: boolean;
  showActivity: boolean;
  showAchievements: boolean;
  showGoals: boolean;
  showPlatforms: boolean;
  showStreak: boolean;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useSettings() {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const isAuthenticated = status === 'authenticated';

  // ==========================================================================
  // FETCH SETTINGS
  // ==========================================================================
  const settingsQuery = useQuery({
    queryKey: queryKeys.user.settings(),
    queryFn: () => SettingsService.get(),
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });

  // ==========================================================================
  // UPDATE SETTINGS
  // ==========================================================================
  const updateMutation = useMutation({
    mutationKey: ['settings', 'update'],
    mutationFn: (data: Partial<UserSettings>) => SettingsService.update(data),
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(queryKeys.user.settings(), updatedSettings);
    },
  });

  const updateSettings = useCallback(
    async (data: Partial<UserSettings>) => {
      return updateMutation.mutateAsync(data);
    },
    [updateMutation]
  );

  // ==========================================================================
  // UPDATE THEME
  // ==========================================================================
  const updateTheme = useCallback(
    async (theme: 'light' | 'dark' | 'system') => {
      return updateSettings({ theme });
    },
    [updateSettings]
  );

  // ==========================================================================
  // UPDATE PRIVACY
  // ==========================================================================
  const updatePrivacyMutation = useMutation({
    mutationKey: ['settings', 'privacy'],
    mutationFn: async (data: Partial<PrivacySettings>) => {
      const response = await apiClient.put<ApiResponse<{ user: Record<string, unknown> }>>(
        '/user/profile',
        data
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to update privacy settings');
      }

      return response.data.data!.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
    },
  });

  const updatePrivacy = useCallback(
    async (data: Partial<PrivacySettings>) => {
      return updatePrivacyMutation.mutateAsync(data);
    },
    [updatePrivacyMutation]
  );

  // ==========================================================================
  // UPDATE SYNC SETTINGS
  // ==========================================================================
  const updateSyncSettings = useCallback(
    async (data: {
      autoSync?: boolean;
      syncFrequency?: 'realtime' | 'hourly' | 'daily' | 'manual';
      syncOnLogin?: boolean;
      syncInBackground?: boolean;
    }) => {
      return updateSettings(data);
    },
    [updateSettings]
  );

  // ==========================================================================
  // UPDATE DASHBOARD LAYOUT
  // ==========================================================================
  const updateDashboardLayout = useCallback(
    async (layout: Record<string, unknown>) => {
      return updateSettings({ dashboardLayout: layout });
    },
    [updateSettings]
  );

  // ==========================================================================
  // RESET SETTINGS
  // ==========================================================================
  const resetMutation = useMutation({
    mutationKey: ['settings', 'reset'],
    mutationFn: () => SettingsService.reset(),
    onSuccess: (defaultSettings) => {
      queryClient.setQueryData(queryKeys.user.settings(), defaultSettings);
    },
  });

  const resetSettings = useCallback(async () => {
    return resetMutation.mutateAsync();
  }, [resetMutation]);

  // ==========================================================================
  // RETURN
  // ==========================================================================
  return useMemo(() => ({
    // Data
    settings: settingsQuery.data ?? null,

    // Individual settings (with defaults)
    theme: settingsQuery.data?.theme ?? 'system',
    language: settingsQuery.data?.language ?? 'en',
    timezone: settingsQuery.data?.timezone ?? 'UTC',
    autoSync: settingsQuery.data?.autoSync ?? true,
    syncFrequency: settingsQuery.data?.syncFrequency ?? 'daily',
    publicProfile: settingsQuery.data?.publicProfile ?? false,
    showInLeaderboard: settingsQuery.data?.showInLeaderboard ?? true,
    keyboardShortcuts: settingsQuery.data?.keyboardShortcuts ?? true,
    compactMode: settingsQuery.data?.compactMode ?? false,

    // Loading states
    isLoading: settingsQuery.isLoading,

    // Error states
    error: settingsQuery.error,

    // Actions
    updateSettings,
    updateTheme,
    updatePrivacy,
    updateSyncSettings,
    updateDashboardLayout,
    resetSettings,
    refetch: settingsQuery.refetch,

    // Mutation states
    isUpdating: updateMutation.isPending,
    isUpdatingPrivacy: updatePrivacyMutation.isPending,
    isResetting: resetMutation.isPending,

    // Mutation errors
    updateError: updateMutation.error,
    privacyError: updatePrivacyMutation.error,
    resetError: resetMutation.error,
  }), [
    settingsQuery.data,
    settingsQuery.isLoading,
    settingsQuery.error,
    settingsQuery.refetch,
    updateSettings,
    updateTheme,
    updatePrivacy,
    updateSyncSettings,
    updateDashboardLayout,
    resetSettings,
    updateMutation.isPending,
    updateMutation.error,
    updatePrivacyMutation.isPending,
    updatePrivacyMutation.error,
    resetMutation.isPending,
    resetMutation.error,
  ]);
}

export default useSettings;