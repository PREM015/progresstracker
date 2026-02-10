/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useAdminCommunication.ts
// PURPOSE: Admin hooks - communication management (newsletter, email)
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './keys';

// =============================================================================
// TYPES
// =============================================================================

export interface Newsletter {
    id: string;
    email: string;
    isActive: boolean;
    isConfirmed: boolean;
    topics: string[];
    subscribedAt: string;
    unsubscribedAt: string | null;
    status?: string; // 'ACTIVE' | 'UNSUBSCRIBED' | 'CONFIRMED' etc.
}

export interface NewsletterStats {
    total: number;
    active: number;
    confirmed: number;
    unconfirmed: number;
}

export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    content: string;
    variables: string[];
    createdAt: string;
    updatedAt: string;
}

// =============================================================================
// ADMIN COMMUNICATION HOOKS
// =============================================================================

export function useAdminNewsletters() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;

    const query = useQuery({
        queryKey: queryKeys.admin.communication.newsletters(),
        queryFn: async (): Promise<Newsletter[]> => {
            const response = await apiClient.get<any>('/admin/newsletter');

            if (response.error) {
                return [];
            }

            const payload = response.data;
            if (Array.isArray(payload)) return payload;
            if (payload && payload.newsletters && Array.isArray(payload.newsletters)) return payload.newsletters;

            return [];
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    return {
        newsletters: query.data ?? [],
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}

export interface EmailStats {
    sent: number;
    opened: number;
    clicked: number;
    bounced: number;
}

export function useAdminEmailStats() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;

    const query = useQuery({
        queryKey: queryKeys.admin.communication.emailStats(),
        queryFn: async () => {
            const response = await apiClient.get<EmailStats>('/admin/email/stats');
            if (response.error) return null;
            return response.data;
        },
        enabled: isAdmin,
    });

    return {
        stats: query.data,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}

export function useAdminEmailTemplates() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: queryKeys.admin.communication.templates(),
        queryFn: async (): Promise<EmailTemplate[]> => {
            const response = await apiClient.get<any>('/admin/email/templates');

            if (response.error) {
                return [];
            }

            const payload = response.data;
            if (Array.isArray(payload)) return payload;
            if (payload && payload.templates && Array.isArray(payload.templates)) return payload.templates;

            return [];
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    const createMutation = useMutation({
        mutationFn: async (data: Partial<EmailTemplate>) => {
            return await apiClient.post<EmailTemplate>('/admin/email/templates', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.communication.templates() });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<EmailTemplate> }) => {
            return await apiClient.patch<EmailTemplate>(`/admin/email/templates/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.communication.templates() });
        },
    });

    return {
        templates: query.data ?? [],
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
        createTemplate: createMutation.mutateAsync,
        updateTemplate: updateMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
    };
}

export default useAdminNewsletters;
