/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useAdminTemplates.ts
// PURPOSE: Admin hooks - content templates (goal templates)
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { AdminTemplatesService } from '@/services/api/admin/templates.service';
import { queryKeys } from './keys';

// =============================================================================
// TYPES
// =============================================================================

export interface GoalTemplate {
    id: string;
    name: string;
    description: string;
    category: 'PERSONAL' | 'PROFESSIONAL' | 'HEALTH' | 'FINANCIAL' | 'EDUCATION' | 'SOCIAL';
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    durationDays?: number;
    createdAt?: string;
    updatedAt?: string;
}

export type GoalTemplateInput = Omit<GoalTemplate, 'id' | 'createdAt' | 'updatedAt'>;

// =============================================================================
// ADMIN TEMPLATES HOOKS
// =============================================================================

export function useAdminGoalTemplates() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: queryKeys.admin.templates.goals(),
        queryFn: async (): Promise<GoalTemplate[]> => {
            return AdminTemplatesService.getGoalTemplates() as any;
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    const createMutation = useMutation({
        mutationFn: async (data: GoalTemplateInput) => {
            return AdminTemplatesService.createGoalTemplate(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.templates.goals() });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<GoalTemplateInput> }) => {
            return AdminTemplatesService.updateGoalTemplate(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.templates.goals() });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return AdminTemplatesService.deleteGoalTemplate(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.admin.templates.goals() });
        },
    });

    return {
        templates: query.data ?? [],
        isLoading: query.isLoading,
        error: query.error,
        createTemplate: createMutation.mutateAsync,
        updateTemplate: updateMutation.mutateAsync,
        deleteTemplate: deleteMutation.mutateAsync,
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
    };
}

export function useAdminGoalTemplate(id: string) {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;

    const query = useQuery({
        queryKey: [...queryKeys.admin.templates.goals(), id],
        queryFn: async (): Promise<GoalTemplate | null> => {
            return AdminTemplatesService.getGoalTemplate(id) as any;
        },
        enabled: isAdmin && !!id,
        staleTime: 5 * 60 * 1000,
    });

    return {
        template: query.data,
        isLoading: query.isLoading,
        error: query.error,
    };
}

export function useAdminTemplateStats() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.isAdmin ?? false;

    const query = useQuery({
        queryKey: [...queryKeys.admin.templates.goals(), 'stats'],
        queryFn: async () => {
            return AdminTemplatesService.getTemplateStats();
        },
        enabled: isAdmin,
        staleTime: 5 * 60 * 1000,
    });

    return {
        stats: query.data,
        isLoading: query.isLoading,
        error: query.error,
    };
}

export default useAdminGoalTemplates;
