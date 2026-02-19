import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { AdminDatabaseService } from '@/services/api/admin/database.service';
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
            return AdminDatabaseService.getBackups();
        },
        enabled: isAdmin,
    });

    const createBackupMutation = useMutation({
        mutationFn: async () => {
            return AdminDatabaseService.createBackup();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.database.backups() });
        },
    });

    const deleteBackupMutation = useMutation({
        mutationFn: async (id: string) => {
            return AdminDatabaseService.deleteBackup(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.database.backups() });
        },
    });

    const restoreBackupMutation = useMutation({
        mutationFn: async (id: string) => {
            return AdminDatabaseService.restoreBackup(id);
        },
    });

    // --- Stats ---

    const statsQuery = useQuery({
        queryKey: queryKeys.admin.database.stats(),
        queryFn: async () => {
            return AdminDatabaseService.getStats();
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
