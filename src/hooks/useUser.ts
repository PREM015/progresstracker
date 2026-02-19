import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { UserService } from '@/services/api/user.service';
import { queryKeys } from './keys';
import { User, UserSettings, UserProfile } from '@/types/user';

export function useUser() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const isAuthenticated = status === 'authenticated';

  // Fetch full user profile
  const profileQuery = useQuery({
    queryKey: queryKeys.user.profile(session?.user?.id || ''),
    queryFn: () => UserService.getProfile(),
    enabled: isAuthenticated && !!session?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch user settings
  const settingsQuery = useQuery({
    queryKey: queryKeys.user.settings(),
    queryFn: () => UserService.getSettings(),
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<UserProfile>) => UserService.updateProfile(data),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(queryKeys.user.profile(session?.user?.id || ''), updatedUser);
      // Also update session if needed (requires session update strategy)
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<UserSettings>) => UserService.updateSettings(data),
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(queryKeys.user.settings(), updatedSettings);
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: () => UserService.deleteAccount(),
    onSuccess: () => {
      // Handle logout or redirect
      window.location.href = '/';
    },
  });

  return {
    user: profileQuery.data ?? (session?.user as User) ?? null,
    settings: settingsQuery.data ?? null,

    isLoading: profileQuery.isLoading || settingsQuery.isLoading,
    error: profileQuery.error || settingsQuery.error,

    updateProfile: updateProfileMutation.mutate,
    isUpdatingProfile: updateProfileMutation.isPending,

    updateSettings: updateSettingsMutation.mutate,
    isUpdatingSettings: updateSettingsMutation.isPending,

    deleteAccount: deleteAccountMutation.mutate,
    isDeletingAccount: deleteAccountMutation.isPending,
  };
}