// ============================================================================
// FILE: src/hooks/useUser.ts
// PURPOSE: User data hook - profile, settings, stats
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useMemo, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './keys';
import type { 
  User, 
  UserProfile, 
  UserStats,
  UpdateProfileInput, 
  UpdatePrivacyInput,
  ChangePasswordInput,
} from '@/types/user';

// =============================================================================
// TYPES
// =============================================================================

interface UserSettings {
  theme: string;
  language: string;
  timezone: string;
  notifications: Record<string, boolean>;
  privacy: Record<string, boolean>;
  // ... other settings
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useUser() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const isAuthenticated = status === 'authenticated';

  // ==========================================================================
  // FETCH CURRENT USER
  // ==========================================================================
  const userQuery = useQuery({
    queryKey: queryKeys.user.profile(),
    queryFn: async (): Promise<User> => {
      const response = await apiClient.get<ApiResponse<{ user: User }>>('/user/profile');
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch user');
      }
      
      return response.data.data!.user;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // ==========================================================================
  // FETCH USER STATS
  // ==========================================================================
  const statsQuery = useQuery({
    queryKey: queryKeys.user.stats(),
    queryFn: async (): Promise<UserStats> => {
      const response = await apiClient.get<ApiResponse<{ stats: UserStats }>>('/user/stats');
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch user stats');
      }
      
      return response.data.data!.stats;
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // ==========================================================================
  // FETCH USER SETTINGS
  // ==========================================================================
  const settingsQuery = useQuery({
    queryKey: queryKeys.user.settings(),
    queryFn: async (): Promise<UserSettings> => {
      const response = await apiClient.get<ApiResponse<{ settings: UserSettings }>>('/user/settings');
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch settings');
      }
      
      return response.data.data!.settings;
    },
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // ==========================================================================
  // UPDATE PROFILE
  // ==========================================================================
  const updateProfileMutation = useMutation({
    mutationKey: ['user', 'updateProfile'],
    mutationFn: async (data: UpdateProfileInput): Promise<User> => {
      const response = await apiClient.put<ApiResponse<{ user: User }>>('/user/profile', data);
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to update profile');
      }
      
      return response.data.data!.user;
    },
    onSuccess: (updatedUser) => {
      // Update cached user data
      queryClient.setQueryData(queryKeys.user.profile(), updatedUser);
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
    },
  });

  const updateProfile = useCallback(
    async (data: UpdateProfileInput) => {
      return updateProfileMutation.mutateAsync(data);
    },
    [updateProfileMutation]
  );

  // ==========================================================================
  // UPDATE PRIVACY SETTINGS
  // ==========================================================================
  const updatePrivacyMutation = useMutation({
    mutationKey: ['user', 'updatePrivacy'],
    mutationFn: async (data: UpdatePrivacyInput): Promise<User> => {
      const response = await apiClient.put<ApiResponse<{ user: User }>>('/user/profile', data);
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to update privacy settings');
      }
      
      return response.data.data!.user;
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(queryKeys.user.profile(), updatedUser);
    },
  });

  const updatePrivacy = useCallback(
    async (data: UpdatePrivacyInput) => {
      return updatePrivacyMutation.mutateAsync(data);
    },
    [updatePrivacyMutation]
  );

  // ==========================================================================
  // UPDATE SETTINGS
  // ==========================================================================
  const updateSettingsMutation = useMutation({
    mutationKey: ['user', 'updateSettings'],
    mutationFn: async (data: Partial<UserSettings>): Promise<UserSettings> => {
      const response = await apiClient.put<ApiResponse<{ settings: UserSettings }>>('/user/settings', data);
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to update settings');
      }
      
      return response.data.data!.settings;
    },
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(queryKeys.user.settings(), updatedSettings);
    },
  });

  const updateSettings = useCallback(
    async (data: Partial<UserSettings>) => {
      return updateSettingsMutation.mutateAsync(data);
    },
    [updateSettingsMutation]
  );

  // ==========================================================================
  // CHANGE PASSWORD
  // ==========================================================================
  const changePasswordMutation = useMutation({
    mutationKey: ['user', 'changePassword'],
    mutationFn: async (data: ChangePasswordInput) => {
      const response = await apiClient.post('/user/password', data);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data;
    },
  });

  const changePassword = useCallback(
    async (data: ChangePasswordInput) => {
      return changePasswordMutation.mutateAsync(data);
    },
    [changePasswordMutation]
  );

  // ==========================================================================
  // UPDATE AVATAR
  // ==========================================================================
  const updateAvatarMutation = useMutation({
    mutationKey: ['user', 'updateAvatar'],
    mutationFn: async (file: File): Promise<string> => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload avatar');
      }
      
      return data.data.url;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() });
    },
  });

  const updateAvatar = useCallback(
    async (file: File) => {
      return updateAvatarMutation.mutateAsync(file);
    },
    [updateAvatarMutation]
  );

  // ==========================================================================
  // CHECK USERNAME AVAILABILITY
  // ==========================================================================
  const checkUsername = useCallback(async (username: string): Promise<boolean> => {
    if (!username || username.length < 3) return false;
    
    const response = await apiClient.get<ApiResponse<{ available: boolean }>>(
      '/auth/check-username',
      { username }
    );
    
    return response.data?.data?.available ?? false;
  }, []);

  // ==========================================================================
  // REFETCH DATA
  // ==========================================================================
  const refetch = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.user.stats() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.user.settings() }),
    ]);
  }, [queryClient]);

  // ==========================================================================
  // RETURN
  // ==========================================================================
  return useMemo(() => ({
    // User data
    user: userQuery.data ?? null,
    stats: statsQuery.data ?? null,
    settings: settingsQuery.data ?? null,
    
    // Session info (from next-auth)
    sessionUser: session?.user ?? null,
    
    // Loading states
    isLoading: userQuery.isLoading,
    isLoadingStats: statsQuery.isLoading,
    isLoadingSettings: settingsQuery.isLoading,
    
    // Error states
    error: userQuery.error,
    statsError: statsQuery.error,
    settingsError: settingsQuery.error,
    
    // Actions
    updateProfile,
    updatePrivacy,
    updateSettings,
    changePassword,
    updateAvatar,
    checkUsername,
    refetch,
    
    // Mutation states
    isUpdatingProfile: updateProfileMutation.isPending,
    isUpdatingSettings: updateSettingsMutation.isPending,
    isChangingPassword: changePasswordMutation.isPending,
    isUploadingAvatar: updateAvatarMutation.isPending,
    
    // Mutation errors
    updateProfileError: updateProfileMutation.error,
    updateSettingsError: updateSettingsMutation.error,
    changePasswordError: changePasswordMutation.error,
    updateAvatarError: updateAvatarMutation.error,
  }), [
    userQuery.data,
    userQuery.isLoading,
    userQuery.error,
    statsQuery.data,
    statsQuery.isLoading,
    statsQuery.error,
    settingsQuery.data,
    settingsQuery.isLoading,
    settingsQuery.error,
    session?.user,
    updateProfile,
    updatePrivacy,
    updateSettings,
    changePassword,
    updateAvatar,
    checkUsername,
    refetch,
    updateProfileMutation.isPending,
    updateProfileMutation.error,
    updateSettingsMutation.isPending,
    updateSettingsMutation.error,
    changePasswordMutation.isPending,
    changePasswordMutation.error,
    updateAvatarMutation.isPending,
    updateAvatarMutation.error,
  ]);
}

// =============================================================================
// PUBLIC PROFILE HOOK
// =============================================================================

export function usePublicProfile(username: string) {
  const query = useQuery({
    queryKey: queryKeys.user.byUsername(username),
    queryFn: async (): Promise<UserProfile> => {
      const response = await apiClient.get<ApiResponse<{ profile: UserProfile }>>(
        `/profile/${username}`
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'User not found');
      }
      
      return response.data.data!.profile;
    },
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
  });

  return {
    profile: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useUser;