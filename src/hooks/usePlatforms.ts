// ============================================================================
// FILE: src/hooks/usePlatforms.ts
// PURPOSE: Platforms hook - available, connected, connect/disconnect
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './keys';
import type { 
  Platform, 
  UserPlatform,
  PlatformConnection,
  ConnectPlatformInput,
  UpdatePlatformConnectionInput,
  PlatformSyncResult,
  PlatformHealthCheck,
} from '@/types/platform';

// =============================================================================
// TYPES
// =============================================================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface PlatformCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function usePlatforms() {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const isAuthenticated = status === 'authenticated';

  // ==========================================================================
  // FETCH AVAILABLE PLATFORMS
  // ==========================================================================
  const availableQuery = useQuery({
    queryKey: queryKeys.platforms.available(),
    queryFn: async (): Promise<Platform[]> => {
      const response = await apiClient.get<ApiResponse<{ platforms: Platform[] }>>(
        '/platforms/available'
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch platforms');
      }
      
      return response.data.data!.platforms;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes (platforms rarely change)
  });

  // ==========================================================================
  // FETCH CONNECTED PLATFORMS
  // ==========================================================================
  const connectedQuery = useQuery({
    queryKey: queryKeys.platforms.connected(),
    queryFn: async (): Promise<UserPlatform[]> => {
      const response = await apiClient.get<ApiResponse<{ connections: UserPlatform[] }>>(
        '/platforms/connected'
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch connected platforms');
      }
      
      return response.data.data!.connections;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // ==========================================================================
  // FETCH PLATFORM CATEGORIES
  // ==========================================================================
  const categoriesQuery = useQuery({
    queryKey: queryKeys.platforms.categories(),
    queryFn: async (): Promise<PlatformCategory[]> => {
      const response = await apiClient.get<ApiResponse<{ categories: PlatformCategory[] }>>(
        '/platforms/categories'
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch categories');
      }
      
      return response.data.data!.categories;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // ==========================================================================
  // FETCH PLATFORM HEALTH
  // ==========================================================================
  const healthQuery = useQuery({
    queryKey: queryKeys.platforms.health(),
    queryFn: async (): Promise<PlatformHealthCheck[]> => {
      const response = await apiClient.get<ApiResponse<{ health: PlatformHealthCheck[] }>>(
        '/platforms/health'
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch health status');
      }
      
      return response.data.data!.health;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // ==========================================================================
  // CONNECT PLATFORM
  // ==========================================================================
  const connectMutation = useMutation({
    mutationKey: ['platforms', 'connect'],
    mutationFn: async (data: ConnectPlatformInput): Promise<UserPlatform> => {
      const response = await apiClient.post<ApiResponse<{ connection: UserPlatform }>>(
        '/platforms/connect',
        data
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to connect platform');
      }
      
      return response.data.data!.connection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platforms.connected() });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    },
  });

  const connect = useCallback(
    async (data: ConnectPlatformInput) => {
      return connectMutation.mutateAsync(data);
    },
    [connectMutation]
  );

  // ==========================================================================
  // DISCONNECT PLATFORM
  // ==========================================================================
  const disconnectMutation = useMutation({
    mutationKey: ['platforms', 'disconnect'],
    mutationFn: async (platformId: string) => {
      const response = await apiClient.post(`/platforms/${platformId}/disconnect`);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return platformId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platforms.connected() });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    },
  });

  const disconnect = useCallback(
    async (platformId: string) => {
      return disconnectMutation.mutateAsync(platformId);
    },
    [disconnectMutation]
  );

  // ==========================================================================
  // UPDATE CONNECTION
  // ==========================================================================
  const updateConnectionMutation = useMutation({
    mutationKey: ['platforms', 'updateConnection'],
    mutationFn: async ({ 
      platformId, 
      data 
    }: { 
      platformId: string; 
      data: UpdatePlatformConnectionInput 
    }): Promise<UserPlatform> => {
      const response = await apiClient.put<ApiResponse<{ connection: UserPlatform }>>(
        `/platforms/${platformId}/settings`,
        data
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to update connection');
      }
      
      return response.data.data!.connection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platforms.connected() });
    },
  });

  const updateConnection = useCallback(
    async (platformId: string, data: UpdatePlatformConnectionInput) => {
      return updateConnectionMutation.mutateAsync({ platformId, data });
    },
    [updateConnectionMutation]
  );

  // ==========================================================================
  // SYNC PLATFORM
  // ==========================================================================
  const syncMutation = useMutation({
    mutationKey: ['platforms', 'sync'],
    mutationFn: async (platformId: string): Promise<PlatformSyncResult> => {
      const response = await apiClient.post<ApiResponse<{ result: PlatformSyncResult }>>(
        `/platforms/${platformId}/sync`
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to sync platform');
      }
      
      return response.data.data!.result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platforms.connected() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tracker.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.sync.all });
    },
  });

  const sync = useCallback(
    async (platformId: string) => {
      return syncMutation.mutateAsync(platformId);
    },
    [syncMutation]
  );

  // ==========================================================================
  // SYNC ALL PLATFORMS
  // ==========================================================================
  const syncAllMutation = useMutation({
    mutationKey: ['platforms', 'syncAll'],
    mutationFn: async (): Promise<PlatformSyncResult[]> => {
      const response = await apiClient.post<ApiResponse<{ results: PlatformSyncResult[] }>>(
        '/platforms/sync-all'
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to sync platforms');
      }
      
      return response.data.data!.results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platforms.connected() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tracker.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.sync.all });
    },
  });

  const syncAll = useCallback(async () => {
    return syncAllMutation.mutateAsync();
  }, [syncAllMutation]);

  // ==========================================================================
  // VERIFY CONNECTION
  // ==========================================================================
  const verifyMutation = useMutation({
    mutationKey: ['platforms', 'verify'],
    mutationFn: async (platformId: string): Promise<boolean> => {
      const response = await apiClient.post<ApiResponse<{ valid: boolean }>>(
        `/platforms/${platformId}/verify`
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to verify connection');
      }
      
      return response.data.data!.valid;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platforms.connected() });
    },
  });

  const verify = useCallback(
    async (platformId: string) => {
      return verifyMutation.mutateAsync(platformId);
    },
    [verifyMutation]
  );

  // ==========================================================================
  // COMPUTED VALUES
  // ==========================================================================
  
  // Map available platforms with connection status
  const platformsWithConnection = useMemo((): PlatformConnection[] => {
    if (!availableQuery.data) return [];
    
    const connectedMap = new Map(
      connectedQuery.data?.map(c => [c.platformId, c]) ?? []
    );
    
    return availableQuery.data.map(platform => {
      const connection = connectedMap.get(platform.id);
      return {
        platform,
        isConnected: !!connection && connection.connectionStatus === 'connected',
        username: connection?.username ?? undefined,
        profileUrl: connection?.profileUrl ?? undefined,
        lastSyncedAt: connection?.lastSyncedAt ?? undefined,
        syncStatus: connection?.syncStatus ? 'idle' : 'idle', // Map from Prisma enum
        connectionStatus: connection?.connectionStatus ?? 'disconnected',
        cachedStats: connection?.cachedStats as Record<string, unknown> ?? undefined,
        error: connection?.lastSyncError ?? connection?.connectionError ?? undefined,
      };
    });
  }, [availableQuery.data, connectedQuery.data]);

  // ==========================================================================
  // RETURN
  // ==========================================================================
  return useMemo(() => ({
    // Data
    available: availableQuery.data ?? [],
    connected: connectedQuery.data ?? [],
    categories: categoriesQuery.data ?? [],
    health: healthQuery.data ?? [],
    platformsWithConnection,
    
    // Loading states
    isLoading: availableQuery.isLoading,
    isLoadingConnected: connectedQuery.isLoading,
    isLoadingCategories: categoriesQuery.isLoading,
    isLoadingHealth: healthQuery.isLoading,
    
    // Error states
    error: availableQuery.error,
    connectedError: connectedQuery.error,
    
    // Actions
    connect,
    disconnect,
    updateConnection,
    sync,
    syncAll,
    verify,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platforms.all });
    },
    
    // Mutation states
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    isSyncing: syncMutation.isPending,
    isSyncingAll: syncAllMutation.isPending,
    isVerifying: verifyMutation.isPending,
    
    // Mutation errors
    connectError: connectMutation.error,
    disconnectError: disconnectMutation.error,
    syncError: syncMutation.error,
    
    // Convenience getters
    connectedCount: connectedQuery.data?.length ?? 0,
    getPlatformById: (id: string) => availableQuery.data?.find(p => p.id === id),
    getPlatformBySlug: (slug: string) => availableQuery.data?.find(p => p.slug === slug),
    getConnectionByPlatformId: (id: string) => connectedQuery.data?.find(c => c.platformId === id),
    isConnected: (platformId: string) => 
      connectedQuery.data?.some(c => c.platformId === platformId && c.connectionStatus === 'connected') ?? false,
  }), [
    availableQuery.data,
    availableQuery.isLoading,
    availableQuery.error,
    connectedQuery.data,
    connectedQuery.isLoading,
    connectedQuery.error,
    categoriesQuery.data,
    categoriesQuery.isLoading,
    healthQuery.data,
    healthQuery.isLoading,
    platformsWithConnection,
    connect,
    disconnect,
    updateConnection,
    sync,
    syncAll,
    verify,
    connectMutation.isPending,
    connectMutation.error,
    disconnectMutation.isPending,
    disconnectMutation.error,
    syncMutation.isPending,
    syncMutation.error,
    syncAllMutation.isPending,
    verifyMutation.isPending,
    queryClient,
  ]);
}

// =============================================================================
// SINGLE PLATFORM HOOK
// =============================================================================

export function usePlatform(idOrSlug: string) {
  const query = useQuery({
    queryKey: queryKeys.platforms.bySlug(idOrSlug),
    queryFn: async (): Promise<Platform & { connection?: UserPlatform }> => {
      const response = await apiClient.get<ApiResponse<{ platform: Platform; connection?: UserPlatform }>>(
        `/platforms/${idOrSlug}`
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Platform not found');
      }
      
      return {
        ...response.data.data!.platform,
        connection: response.data.data!.connection,
      };
    },
    enabled: !!idOrSlug,
  });

  return {
    platform: query.data ?? null,
    connection: query.data?.connection ?? null,
    isConnected: query.data?.connection?.connectionStatus === 'connected',
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// =============================================================================
// PLATFORM STATS HOOK
// =============================================================================

export function usePlatformStats(platformId: string) {
  const query = useQuery({
    queryKey: queryKeys.platforms.stats(platformId),
    queryFn: async () => {
      const response = await apiClient.get<ApiResponse<{ stats: Record<string, unknown> }>>(
        `/platforms/${platformId}/stats`
      );
      
      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch stats');
      }
      
      return response.data.data!.stats;
    },
    enabled: !!platformId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    stats: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export default usePlatforms;