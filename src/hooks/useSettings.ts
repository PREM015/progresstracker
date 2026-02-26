'use client';

import useSWR, { useSWRConfig } from 'swr';
import { useSession } from 'next-auth/react';
import { SWR_STATIC_CONFIG } from '@/lib/swr-config';
import { SettingsService, UserSettings } from '@/services/api/settings.service';

const settingsFetcher = () => SettingsService.get();

export function useSettings() {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';
  const { mutate } = useSWRConfig();

  const { data: settings, error, isLoading, isValidating } = useSWR(
    isAuthenticated ? '/api/settings' : null,
    settingsFetcher,
    SWR_STATIC_CONFIG
  );

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!settings) return; // Guard against undefined settings
    // Optimistic update
    await mutate('/api/settings', { ...settings, ...newSettings }, false);

    try {
      await SettingsService.update(newSettings as any);
      // Revalidate to ensure sync
      mutate('/api/settings');
    } catch (err) {
      // Rollback on error
      mutate('/api/settings');
      throw err;
    }
  };

  return {
    settings,
    isLoading,
    error,
    isValidating,
    updateSettings,
    // Aliases for compatibility/convenience
    theme: settings?.theme || 'system',
    language: settings?.language || 'en',
    timezone: settings?.timezone || 'UTC',
    autoSync: settings?.autoSync ?? true,
    compactMode: settings?.compactMode ?? false,
    publicProfile: settings?.publicProfile ?? false,
    updatePrivacy: updateSettings, // Use updateSettings as base or specialized if needed
    isUpdatingPrivacy: isValidating,
    isUpdating: isValidating,
  };
}