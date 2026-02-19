/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useAdminCommunication.ts
// PURPOSE: Admin hooks - communication management (newsletter, email)
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { AdminCommunicationService } from '@/services/api/admin/communication.service';
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
            return AdminCommunicationService.getNewsletters();
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
            return AdminCommunicationService.getEmailStats();
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
            return AdminCommunicationService.getTemplates();
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    const createMutation = useMutation({
        mutationFn: async (data: Partial<EmailTemplate>) => {
            return AdminCommunicationService.createTemplate(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.communication.templates() });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<EmailTemplate> }) => {
            return AdminCommunicationService.updateTemplate(id, data);
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
