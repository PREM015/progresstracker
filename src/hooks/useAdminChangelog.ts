import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import apiClient from '@/lib/apiClient';
import { queryKeys } from './keys';

export interface ChangelogEntry {
    id: string;
    version: string;
    changes: string;
    type: 'FEATURE' | 'BUGFIX' | 'IMPROVEMENT';
    createdAt: string;
    publishedAt?: string;
}

export interface ChangelogInput {
    version: string;
    changes: string;
    type: 'FEATURE' | 'BUGFIX' | 'IMPROVEMENT';
}

export function useAdminChangelog() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;
    const queryClient = useQueryClient();

    const changelogQuery = useQuery({
        queryKey: queryKeys.admin.changelog.list(),
        queryFn: async () => {
            const response = await apiClient.get<ChangelogEntry[]>('/admin/changelog');
            if (response.error) return [];
            return response.data || [];
        },
        enabled: isAdmin,
    });

    const createChangelogMutation = useMutation({
        mutationFn: async (data: ChangelogInput) => {
            return await apiClient.post<ChangelogEntry>('/admin/changelog', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.changelog.list() });
        },
    });

    const updateChangelogMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: ChangelogInput }) => {
            return await apiClient.patch<ChangelogEntry>(`/admin/changelog/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.changelog.list() });
        },
    });

    const deleteChangelogMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiClient.delete<void>(`/admin/changelog/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.changelog.list() });
        },
    });

    const publishChangelogMutation = useMutation({
        mutationFn: async (id: string) => {
            return await apiClient.post<void>(`/admin/changelog/${id}/publish`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.changelog.list() });
        },
    });

    return {
        entries: changelogQuery.data ?? [],
        isLoading: changelogQuery.isLoading,
        createEntry: createChangelogMutation.mutateAsync,
        updateEntry: updateChangelogMutation.mutateAsync,
        deleteEntry: deleteChangelogMutation.mutateAsync,
        publishEntry: publishChangelogMutation.mutateAsync,
        isCreating: createChangelogMutation.isPending,
        isUpdating: updateChangelogMutation.isPending,
        isDeleting: deleteChangelogMutation.isPending,
        isPublishing: publishChangelogMutation.isPending,
    };
}
