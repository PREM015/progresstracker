'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import apiClient from '@/lib/apiClient';
import { queryKeys } from './keys';

export interface WaitlistEntry {
    id: string;
    email: string;
    name: string | null;
    status: 'waiting' | 'invited' | 'joined';
    createdAt: string;
    invitedAt?: string;
    joinedAt?: string;
    position?: number;
}

export interface WaitlistStats {
    total: number;
    pending: number;
    approved: number;
    conversionRate: number;
}

export function useAdminGrowth() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;
    const queryClient = useQueryClient();

    // --- Waitlist ---

    const [filters, setFilters] = useState({ page: 1, limit: 25, status: '', search: '' });

    const waitlistQuery = useQuery({
        queryKey: queryKeys.admin.growth.waitlist(filters),
        queryFn: async () => {
            const params = new URLSearchParams();
            params.set('page', String(filters.page));
            params.set('limit', String(filters.limit));
            if (filters.status) params.set('status', filters.status);
            if (filters.search) params.set('search', filters.search);

            const response = await apiClient.get<{ entries: WaitlistEntry[], pagination: any }>(`/admin/waitlist?${params.toString()}`);
            if (response.error) return { entries: [], pagination: {} };
            return response.data || { entries: [], pagination: {} };
        },
        enabled: isAdmin,
        placeholderData: keepPreviousData,
    });

    const waitlistStatsQuery = useQuery({
        queryKey: queryKeys.admin.growth.stats(),
        queryFn: async () => {
            const response = await apiClient.get<WaitlistStats>('/admin/waitlist/stats');
            if (response.error) return null;
            return response.data;
        },
        enabled: isAdmin,
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            return await apiClient.put<void>(`/admin/waitlist/${id}`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.growth.waitlist() });
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.growth.stats() });
        },
    });

    const sendInvitesMutation = useMutation({
        mutationFn: async (emails: string[]) => {
            return await apiClient.post<void>('/admin/waitlist/invite', { emails });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.growth.waitlist() });
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.growth.stats() });
        },
    });

    const deleteWaitlistMutation = useMutation({
        mutationFn: async (id: string) => {
            // Using query param as seen in WaitlistTable
            // However, apiClient delete signature I updated earlier supports body but not params object directly in simplified call
            // I'll construct the url manually
            return await apiClient.delete<void>(`/admin/waitlist?ids=${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.growth.waitlist() });
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.growth.stats() });
        },
    });

    return {
        // Waitlist
        waitlist: waitlistQuery.data?.entries ?? [],
        pagination: waitlistQuery.data?.pagination ?? {},
        isLoadingWaitlist: waitlistQuery.isLoading,
        filters,
        setFilters,

        stats: waitlistStatsQuery.data,
        isLoadingStats: waitlistStatsQuery.isLoading,

        updateStatus: updateStatusMutation.mutateAsync,
        sendInvites: sendInvitesMutation.mutateAsync,
        deleteEntry: deleteWaitlistMutation.mutateAsync,

        isUpdating: updateStatusMutation.isPending,
        isSendingInvites: sendInvitesMutation.isPending,
        isDeleting: deleteWaitlistMutation.isPending,
    };
}
