'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { AdminSyncService } from '@/services/api/admin/sync.service';
import { queryKeys } from './keys';

export interface SyncStatus {
    activeSyncs: number;
    successRate: number;
    lastSync: string | null;
    platformStatus: {
        id: string;
        name: string;
        status: string;
        lastSync: string | null;
    }[];
}

export interface SyncScheduleConfig {
    enabled: boolean;
    interval: string;
    platforms: string[];
}

export function useAdminSync() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;
    const queryClient = useQueryClient();

    const statusQuery = useQuery({
        queryKey: queryKeys.admin.sync.stats(), // Keep key name or change to status
        queryFn: async () => {
            return AdminSyncService.getSyncStatus();
        },
        enabled: isAdmin,
        refetchInterval: 10000,
    });

    const scheduleQuery = useQuery({
        queryKey: queryKeys.admin.sync.config(),
        queryFn: async () => {
            return AdminSyncService.getSyncSchedule();
        },
        enabled: isAdmin,
        retry: false,
    });

    const triggerSyncMutation = useMutation({
        mutationFn: async (data: any) => {
            return AdminSyncService.triggerSync(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.sync.stats() });
        },
    });

    const updateScheduleMutation = useMutation({
        mutationFn: async (data: SyncScheduleConfig) => {
            return AdminSyncService.updateSchedule(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.sync.config() });
        },
    });

    return {
        status: statusQuery.data,
        schedule: scheduleQuery.data,
        isLoadingStatus: statusQuery.isLoading,
        isLoadingSchedule: scheduleQuery.isLoading,

        triggerSync: triggerSyncMutation.mutateAsync,
        saveSchedule: updateScheduleMutation.mutateAsync,

        isSyncing: triggerSyncMutation.isPending,
        isSavingSchedule: updateScheduleMutation.isPending,
    };
}
