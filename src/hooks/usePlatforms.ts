import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { PlatformService } from '@/services/api/platform.service';
import { queryKeys } from './keys';
import { Platform, PlatformConnection } from '@/types/platform';

export function usePlatforms() {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const isAuthenticated = status === 'authenticated';

  // Fetch all platforms
  const platformsQuery = useQuery({
    queryKey: queryKeys.platforms.all,
    queryFn: () => PlatformService.getAll(),
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch connected platforms
  const connectedQuery = useQuery({
    queryKey: queryKeys.platforms.connected(),
    queryFn: () => PlatformService.getConnected(),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch sync logs
  const logsQuery = useQuery({
    queryKey: [...queryKeys.platforms.all, 'logs'],
    queryFn: () => PlatformService.getSyncLogs(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // Connect platform mutation
  const connectMutation = useMutation({
    mutationFn: ({ platformId, data }: { platformId: string; data: Record<string, any> }) =>
      PlatformService.connect(platformId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platforms.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.dashboard() });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.platforms.all, 'logs'] });
    },
  });

  // Disconnect platform mutation
  const disconnectMutation = useMutation({
    mutationFn: (platformId: string) => PlatformService.disconnect(platformId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platforms.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.dashboard() });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.platforms.all, 'logs'] });
    },
  });

  // Sync platform mutation
  const syncMutation = useMutation({
    mutationFn: (platformId: string) => PlatformService.sync(platformId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platforms.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.dashboard() });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.platforms.all, 'logs'] });
    },
  });

  return {
    platforms: platformsQuery.data ?? [],
    connectedPlatforms: connectedQuery.data ?? [],
    isLoading: platformsQuery.isLoading || connectedQuery.isLoading,
    error: platformsQuery.error || connectedQuery.error,

    connect: connectMutation.mutate,
    isConnecting: connectMutation.isPending,

    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,

    sync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,

    logs: logsQuery.data ?? [],
    isLoadingLogs: logsQuery.isLoading,
  };
}