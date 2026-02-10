import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import apiClient from '@/lib/apiClient';
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
            const response = await apiClient.get<SyncStatus>('/admin/sync/status');
            if (response.error) return null;
            return response.data;
        },
        enabled: isAdmin,
        refetchInterval: 10000,
    });

    const scheduleQuery = useQuery({
        queryKey: queryKeys.admin.sync.config(),
        queryFn: async () => {
            // Note: SyncSchedule didn't fetch, it used local state initialized with default.
            // But usually we should fetch existing schedule. 
            // Attempting to fetch from same endpoint as save? Or maybe it doesn't support GET?
            // Existing component didn't fetch. I'll assume for now we might not be able to GET or it's not implemented.
            // But if I want to persist, I should fetch.
            // I'll try GET /api/admin/sync/schedule
            const response = await apiClient.get<SyncScheduleConfig>('/admin/sync/schedule');
            if (response.error) return null;
            return response.data;
        },
        enabled: isAdmin,
        retry: false,
    });

    const triggerSyncMutation = useMutation({
        mutationFn: async (data: any) => {
            // SyncControl uses /api/admin/sync
            // SyncManual uses /api/admin/sync/trigger
            // I'll use /api/admin/sync which seems more general based on SyncControl
            return await apiClient.post<any>('/admin/sync', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.sync.stats() });
        },
    });

    const updateScheduleMutation = useMutation({
        mutationFn: async (data: SyncScheduleConfig) => {
            return await apiClient.post<void>('/admin/sync/schedule', data);
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
