'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { AdminMaintenanceService } from '@/services/api/admin/maintenance.service';
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
            return AdminMaintenanceService.getMaintenanceWindows();
        },
        enabled: isAdmin,
    });

    const createMaintenanceMutation = useMutation({
        mutationFn: async (data: MaintenanceInput) => {
            return AdminMaintenanceService.createMaintenanceWindow(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.maintenance.windows() });
        },
    });

    const deleteMaintenanceMutation = useMutation({
        mutationFn: async (id: string) => {
            return AdminMaintenanceService.deleteMaintenanceWindow(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.maintenance.windows() });
        },
    });

    const toggleMaintenanceMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            return AdminMaintenanceService.toggleMaintenanceWindow(id, isActive);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.maintenance.windows() });
        },
    });

    // --- Cache ---

    const cacheStatsQuery = useQuery({
        queryKey: queryKeys.admin.cache.stats(),
        queryFn: async () => {
            return AdminMaintenanceService.getCacheStats();
        },
        enabled: isAdmin,
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    const clearCacheMutation = useMutation({
        mutationFn: async (key?: string) => {
            return AdminMaintenanceService.clearCache(key);
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
