import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import apiClient from '@/lib/apiClient';
import { queryKeys } from './keys';

export interface MaintenanceWindow {
    id: string;
    title: string;
    description: string | null;
    startTime: string;
    endTime: string;
    isActive: boolean;
    createdAt: string;
}

export interface MaintenanceInput {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
}

export interface CacheStats {
    totalKeys: number;
    hitRate: number;
    memoryUsed: number;
    // Add other stats as needed
}

export function useAdminMaintenance() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;
    const queryClient = useQueryClient();

    // --- Maintenance Windows ---

    const maintenanceQuery = useQuery({
        queryKey: queryKeys.admin.maintenance.windows(),
        queryFn: async () => {
            const response = await apiClient.get<MaintenanceWindow[]>('/admin/maintenance');
            if (response.error) return [];
            return response.data || [];
        },
        enabled: isAdmin,
    });

    const createMaintenanceMutation = useMutation({
        mutationFn: async (data: MaintenanceInput) => {
            return await apiClient.post<MaintenanceWindow>('/admin/maintenance', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.maintenance.windows() });
        },
    });

    const deleteMaintenanceMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiClient.delete<void>(`/admin/maintenance/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.maintenance.windows() });
        },
    });

    const toggleMaintenanceMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const endpoint = isActive ? 'deactivate' : 'activate';
            return await apiClient.post<void>(`/admin/maintenance/${id}/${endpoint}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.maintenance.windows() });
        },
    });

    // --- Cache ---

    const cacheStatsQuery = useQuery({
        queryKey: queryKeys.admin.cache.stats(),
        queryFn: async () => {
            const response = await apiClient.get<CacheStats>('/admin/cache/stats');
            if (response.error) return null;
            return response.data;
        },
        enabled: isAdmin,
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    const clearCacheMutation = useMutation({
        mutationFn: async (key?: string) => {
            // If key is provided, clear specific key? Or maybe separate endpoint?
            // Assuming general clear or specific if supported.
            // Based on CacheClearButton, it likely hits /api/admin/cache/clear
            return await apiClient.post<void>('/admin/cache/clear', { key });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.cache.stats() });
        },
    });

    return {
        // Maintenance
        maintenanceWindows: maintenanceQuery.data ?? [],
        isLoadingMaintenance: maintenanceQuery.isLoading,
        createMaintenanceWindow: createMaintenanceMutation.mutateAsync,
        deleteMaintenanceWindow: deleteMaintenanceMutation.mutateAsync,
        toggleMaintenanceWindow: toggleMaintenanceMutation.mutateAsync,
        isCreatingMaintenance: createMaintenanceMutation.isPending,
        isDeletingMaintenance: deleteMaintenanceMutation.isPending,
        isTogglingMaintenance: toggleMaintenanceMutation.isPending,

        // Cache
        cacheStats: cacheStatsQuery.data,
        isLoadingCacheStats: cacheStatsQuery.isLoading,
        clearCache: clearCacheMutation.mutateAsync,
        isClearingCache: clearCacheMutation.isPending,
    };
}
