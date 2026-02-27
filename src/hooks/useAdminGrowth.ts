'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { AdminGrowthService } from '@/services/api/admin/growth.service';
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
            const params: Record<string, string> = {
                page: String(filters.page),
                limit: String(filters.limit),
            };
            if (filters.status) params.status = filters.status;
            if (filters.search) params.search = filters.search;

            return AdminGrowthService.getWaitlist(params);
        },
        enabled: isAdmin,
        placeholderData: keepPreviousData,
    });

    const waitlistStatsQuery = useQuery({
        queryKey: queryKeys.admin.growth.stats(),
        queryFn: async () => {
            return AdminGrowthService.getStats();
        },
        enabled: isAdmin,
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            return AdminGrowthService.updateStatus(id, status);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.growth.waitlist() });
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.growth.stats() });
        },
    });

    const sendInvitesMutation = useMutation({
        mutationFn: async (emails: string[]) => {
            return AdminGrowthService.sendInvites(emails);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.growth.waitlist() });
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.growth.stats() });
        },
    });

    const deleteWaitlistMutation = useMutation({
        mutationFn: async (id: string) => {
            return AdminGrowthService.deleteEntries(id);
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
