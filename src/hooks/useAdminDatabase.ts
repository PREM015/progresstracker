import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import apiClient from '@/lib/apiClient';
import { queryKeys } from './keys';

export interface Backup {
    id: string;
    name: string;
    size: number;
    createdAt: string;
    path: string;
}

export interface DatabaseStats {
    totalRecords: number;
    size: number;
    tables: number;
}

export function useAdminDatabase() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;
    const queryClient = useQueryClient();

    // --- Backups ---

    const backupsQuery = useQuery({
        queryKey: queryKeys.admin.database.backups(),
        queryFn: async () => {
            const response = await apiClient.get<Backup[]>('/admin/database/backups');
            if (response.error) return [];
            return response.data || [];
        },
        enabled: isAdmin,
    });

    const createBackupMutation = useMutation({
        mutationFn: async () => {
            return await apiClient.post<void>('/admin/database/backup');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.database.backups() });
        },
    });

    const deleteBackupMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiClient.delete<void>(`/admin/database/backup/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.database.backups() });
        },
    });

    const restoreBackupMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiClient.post<void>(`/admin/database/backup/${id}/restore`);
        },
    });

    // --- Stats ---

    const statsQuery = useQuery({
        queryKey: queryKeys.admin.database.stats(),
        queryFn: async () => {
            const response = await apiClient.get<DatabaseStats>('/admin/database/stats');
            if (response.error) return null;
            return response.data;
        },
        enabled: isAdmin,
    });

    return {
        // Backups
        backups: backupsQuery.data ?? [],
        isLoadingBackups: backupsQuery.isLoading,
        createBackup: createBackupMutation.mutateAsync,
        deleteBackup: deleteBackupMutation.mutateAsync,
        restoreBackup: restoreBackupMutation.mutateAsync,
        isCreatingBackup: createBackupMutation.isPending,
        isDeletingBackup: deleteBackupMutation.isPending,
        isRestoringBackup: restoreBackupMutation.isPending,

        // Stats
        stats: statsQuery.data,
        isLoadingStats: statsQuery.isLoading,
    };
}
