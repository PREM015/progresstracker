/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useAdminSupport.ts
// PURPOSE: Admin hooks - support tickets management
// ============================================================================

'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './keys';

// =============================================================================
// TYPES
// =============================================================================

export interface SupportTicket {
    id: string;
    ticketNumber: string;
    subject: string;
    message: string;
    status: string;
    priority: string;
    category: string;
    user: {
        name: string | null;
        email: string | null;
    };
    assignedTo: {
        name: string | null;
        email: string | null;
    } | null;
    createdAt: string;
    updatedAt: string;
    _count: {
        replies: number;
    };
}

export interface TicketFilters {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    priority?: string;
}

interface TicketsResponse {
    data: SupportTicket[];
    meta: {
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    };
}

// =============================================================================
// ADMIN SUPPORT HOOK
// =============================================================================

export function useAdminSupport(filters: TicketFilters = {}) {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;

    // ==========================================================================
    // FETCH TICKETS
    // ==========================================================================
    const ticketsQuery = useQuery<TicketsResponse>({
        queryKey: queryKeys.admin.tickets(filters as Record<string, unknown>),
        queryFn: async (): Promise<TicketsResponse> => {
            // Build query params
            const params: Record<string, string> = {};
            if (filters.page) params.page = String(filters.page);
            if (filters.limit) params.limit = String(filters.limit);
            if (filters.search) params.search = filters.search;
            if (filters.status && filters.status !== 'all') params.status = filters.status;
            if (filters.priority) params.priority = filters.priority;

            const response = await apiClient.get<any>('/admin/support-tickets', params);

            if (response.error) {
                throw new Error(response.error);
            }

            const payload = response.data;

            // Normalize response to match TicketsResponse structure
            // If API returns simple array (like in SupportTicketsList original code), wrap it
            if (Array.isArray(payload)) {
                return {
                    data: payload,
                    meta: {
                        pagination: {
                            page: filters.page || 1,
                            limit: filters.limit || 20,
                            total: payload.length,
                            totalPages: 1
                        }
                    }
                };
            }

            // If API returns object with data/tickets
            const data = payload.tickets || payload.data || [];
            const meta = payload.meta || payload.pagination || {
                pagination: {
                    page: filters.page || 1,
                    limit: filters.limit || 20,
                    total: data.length,
                    totalPages: 1
                }
            };

            return { data, meta };
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    return {
        tickets: ticketsQuery.data?.data ?? [],
        pagination: ticketsQuery.data?.meta.pagination,
        isLoading: ticketsQuery.isLoading,
        error: ticketsQuery.error,
        refetch: ticketsQuery.refetch,
    };
}

export default useAdminSupport;
