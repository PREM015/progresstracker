/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useGoals.ts
// PURPOSE: Goals hook - CRUD, progress tracking, templates
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from './keys';
import type {
  Goal,
  GoalWithProgress,
  GoalStats,
  GoalTemplate,
  GoalReminder,
  CreateGoalRequest,
  UpdateGoalRequest,
  GoalFilter,
  GoalStatus,
} from '@/types/goal';
import { calculateGoalProgress } from '@/types/goal';

// =============================================================================
// TYPES
// =============================================================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useGoals(filters: GoalFilter & { [key: string]: any } = {}) {
  const { status } = useSession();
  const queryClient = useQueryClient();
  const isAuthenticated = status === 'authenticated';

  // ==========================================================================
  // FETCH GOALS
  // ==========================================================================
  const goalsQuery = useQuery({
    queryKey: queryKeys.goals.list(filters),
    queryFn: async (): Promise<Goal[]> => {
      const params: Record<string, string> = {};

      if (filters.status) {
        params.status = Array.isArray(filters.status)
          ? filters.status.join(',')
          : filters.status;
      }
      if (filters.type) {
        params.type = Array.isArray(filters.type)
          ? filters.type.join(',')
          : filters.type;
      }
      if (filters.category) {
        params.category = Array.isArray(filters.category)
          ? filters.category.join(',')
          : filters.category;
      }
      if (filters.platformId) params.platformId = filters.platformId;
      if (filters.search) params.search = filters.search;

      const response = await apiClient.get<ApiResponse<{ goals: Goal[] }>>(
        '/goals',
        params
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch goals');
      }

      return response.data.data!.goals;
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH ACTIVE GOALS
  // ==========================================================================
  const activeQuery = useQuery({
    queryKey: queryKeys.goals.active(),
    queryFn: async (): Promise<GoalWithProgress[]> => {
      const response = await apiClient.get<ApiResponse<{ goals: Goal[] }>>(
        '/goals/active'
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch active goals');
      }

      // Add progress info to each goal
      return response.data.data!.goals.map(goal => ({
        ...goal,
        progressInfo: calculateGoalProgress(goal),
      }));
    },
    enabled: isAuthenticated,
    staleTime: 1 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH GOAL STATS
  // ==========================================================================
  const statsQuery = useQuery({
    queryKey: queryKeys.goals.stats(),
    queryFn: async (): Promise<GoalStats> => {
      const response = await apiClient.get<ApiResponse<{ stats: GoalStats }>>(
        '/goals/stats'
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch goal stats');
      }

      return response.data.data!.stats;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH TEMPLATES
  // ==========================================================================
  const templatesQuery = useQuery({
    queryKey: queryKeys.goals.templates(),
    queryFn: async (): Promise<GoalTemplate[]> => {
      const response = await apiClient.get<ApiResponse<{ templates: GoalTemplate[] }>>(
        '/goals/templates'
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch templates');
      }

      return response.data.data!.templates;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // ==========================================================================
  // CREATE GOAL
  // ==========================================================================
  const createMutation = useMutation({
    mutationKey: ['goals', 'create'],
    mutationFn: async (data: CreateGoalRequest): Promise<Goal> => {
      const response = await apiClient.post<ApiResponse<{ goal: Goal }>>(
        '/goals',
        data
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to create goal');
      }

      return response.data.data!.goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
    },
  });

  const createGoal = useCallback(
    async (data: CreateGoalRequest) => {
      return createMutation.mutateAsync(data);
    },
    [createMutation]
  );

  // ==========================================================================
  // CREATE FROM TEMPLATE
  // ==========================================================================
  const createFromTemplateMutation = useMutation({
    mutationKey: ['goals', 'createFromTemplate'],
    mutationFn: async ({
      templateId,
      overrides
    }: {
      templateId: string;
      overrides?: Partial<CreateGoalRequest>
    }): Promise<Goal> => {
      const response = await apiClient.post<ApiResponse<{ goal: Goal }>>(
        '/goals',
        { templateId, ...overrides }
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to create goal from template');
      }

      return response.data.data!.goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
    },
  });

  const createFromTemplate = useCallback(
    async (templateId: string, overrides?: Partial<CreateGoalRequest>) => {
      return createFromTemplateMutation.mutateAsync({ templateId, overrides });
    },
    [createFromTemplateMutation]
  );

  // ==========================================================================
  // UPDATE GOAL
  // ==========================================================================
  const updateMutation = useMutation({
    mutationKey: ['goals', 'update'],
    mutationFn: async ({
      id,
      data
    }: {
      id: string;
      data: UpdateGoalRequest
    }): Promise<Goal> => {
      const response = await apiClient.put<ApiResponse<{ goal: Goal }>>(
        `/goals/${id}`,
        data
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to update goal');
      }

      return response.data.data!.goal;
    },
    onSuccess: (updatedGoal) => {
      queryClient.setQueryData(queryKeys.goals.byId(updatedGoal.id), updatedGoal);
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.active() });
    },
  });

  const updateGoal = useCallback(
    async (id: string, data: UpdateGoalRequest) => {
      return updateMutation.mutateAsync({ id, data });
    },
    [updateMutation]
  );

  // ==========================================================================
  // UPDATE PROGRESS
  // ==========================================================================
  const updateProgressMutation = useMutation({
    mutationKey: ['goals', 'updateProgress'],
    mutationFn: async ({
      id,
      progress
    }: {
      id: string;
      progress: number
    }): Promise<Goal> => {
      const response = await apiClient.post<ApiResponse<{ goal: Goal }>>(
        `/goals/${id}/progress`,
        { progress }
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to update progress');
      }

      return response.data.data!.goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.achievements.all });
    },
  });

  const updateProgress = useCallback(
    async (id: string, progress: number) => {
      return updateProgressMutation.mutateAsync({ id, progress });
    },
    [updateProgressMutation]
  );

  // ==========================================================================
  // COMPLETE GOAL
  // ==========================================================================
  const completeMutation = useMutation({
    mutationKey: ['goals', 'complete'],
    mutationFn: async (id: string): Promise<Goal> => {
      const response = await apiClient.post<ApiResponse<{ goal: Goal }>>(
        `/goals/${id}/complete`
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to complete goal');
      }

      return response.data.data!.goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.achievements.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    },
  });

  const completeGoal = useCallback(
    async (id: string) => {
      return completeMutation.mutateAsync(id);
    },
    [completeMutation]
  );

  // ==========================================================================
  // ARCHIVE GOAL
  // ==========================================================================
  const archiveMutation = useMutation({
    mutationKey: ['goals', 'archive'],
    mutationFn: async (id: string): Promise<Goal> => {
      const response = await apiClient.post<ApiResponse<{ goal: Goal }>>(
        `/goals/${id}/archive`
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to archive goal');
      }

      return response.data.data!.goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
    },
  });

  const archiveGoal = useCallback(
    async (id: string) => {
      return archiveMutation.mutateAsync(id);
    },
    [archiveMutation]
  );

  // ==========================================================================
  // UNARCHIVE GOAL
  // ==========================================================================
  const unarchiveMutation = useMutation({
    mutationKey: ['goals', 'unarchive'],
    mutationFn: async (id: string): Promise<Goal> => {
      const response = await apiClient.post<ApiResponse<{ goal: Goal }>>(
        `/goals/${id}/unarchive`
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to unarchive goal');
      }

      return response.data.data!.goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
    },
  });

  const unarchiveGoal = useCallback(
    async (id: string) => {
      return unarchiveMutation.mutateAsync(id);
    },
    [unarchiveMutation]
  );

  // ==========================================================================
  // PAUSE/RESUME GOAL
  // ==========================================================================
  const pauseMutation = useMutation({
    mutationKey: ['goals', 'pause'],
    mutationFn: async (id: string): Promise<Goal> => {
      const response = await apiClient.post<ApiResponse<{ goal: Goal }>>(
        `/goals/${id}/pause`
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to pause goal');
      }

      return response.data.data!.goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
    },
  });

  const pauseGoal = useCallback(
    async (id: string) => {
      return pauseMutation.mutateAsync(id);
    },
    [pauseMutation]
  );

  const resumeMutation = useMutation({
    mutationKey: ['goals', 'resume'],
    mutationFn: async (id: string): Promise<Goal> => {
      const response = await apiClient.post<ApiResponse<{ goal: Goal }>>(
        `/goals/${id}/resume`
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to resume goal');
      }

      return response.data.data!.goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
    },
  });

  const resumeGoal = useCallback(
    async (id: string) => {
      return resumeMutation.mutateAsync(id);
    },
    [resumeMutation]
  );

  // ==========================================================================
  // DELETE GOAL
  // ==========================================================================
  const deleteMutation = useMutation({
    mutationKey: ['goals', 'delete'],
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/goals/${id}`);

      if (response.error) {
        throw new Error(response.error);
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
    },
  });

  const deleteGoal = useCallback(
    async (id: string) => {
      return deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  // ==========================================================================
  // RETURN
  // ==========================================================================
  return useMemo(() => ({
    // Data
    goals: goalsQuery.data ?? [],
    activeGoals: activeQuery.data ?? [],
    stats: statsQuery.data ?? null,
    templates: templatesQuery.data ?? [],

    // Loading states
    isLoading: goalsQuery.isLoading,
    isLoadingActive: activeQuery.isLoading,
    isLoadingStats: statsQuery.isLoading,
    isLoadingTemplates: templatesQuery.isLoading,

    // Error states
    error: goalsQuery.error,
    activeError: activeQuery.error,
    statsError: statsQuery.error,

    // Actions
    createGoal,
    createFromTemplate,
    updateGoal,
    updateProgress,
    completeGoal,
    archiveGoal,
    unarchiveGoal,
    pauseGoal,
    resumeGoal,
    deleteGoal,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
    },

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isUpdatingProgress: updateProgressMutation.isPending,
    isCompleting: completeMutation.isPending,
    isArchiving: archiveMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Mutation errors
    createError: createMutation.error,
    updateError: updateMutation.error,

    // Convenience getters
    getGoalById: (id: string) => goalsQuery.data?.find(g => g.id === id),
    getGoalsByStatus: (status: GoalStatus) =>
      goalsQuery.data?.filter(g => g.status === status) ?? [],
    activeCount: activeQuery.data?.length ?? 0,
    completedCount: statsQuery.data?.completed ?? 0,
  }), [
    goalsQuery.data,
    goalsQuery.isLoading,
    goalsQuery.error,
    activeQuery.data,
    activeQuery.isLoading,
    activeQuery.error,
    statsQuery.data,
    statsQuery.isLoading,
    statsQuery.error,
    templatesQuery.data,
    templatesQuery.isLoading,
    createGoal,
    createFromTemplate,
    updateGoal,
    updateProgress,
    completeGoal,
    archiveGoal,
    unarchiveGoal,
    pauseGoal,
    resumeGoal,
    deleteGoal,
    createMutation.isPending,
    createMutation.error,
    updateMutation.isPending,
    updateMutation.error,
    updateProgressMutation.isPending,
    completeMutation.isPending,
    archiveMutation.isPending,
    deleteMutation.isPending,
    queryClient,
  ]);
}

// =============================================================================
// SINGLE GOAL HOOK
// =============================================================================

export function useGoal(id: string) {
  const query = useQuery({
    queryKey: queryKeys.goals.byId(id),
    queryFn: async (): Promise<GoalWithProgress> => {
      const response = await apiClient.get<ApiResponse<{ goal: Goal }>>(
        `/goals/${id}`
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Goal not found');
      }

      const goal = response.data.data!.goal;
      return {
        ...goal,
        progressInfo: calculateGoalProgress(goal),
      };
    },
    enabled: !!id,
  });

  return {
    goal: query.data ?? null,
    progressInfo: query.data?.progressInfo ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// =============================================================================
// GOAL REMINDERS HOOK
// =============================================================================

export function useGoalReminders(goalId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.goals.reminders(),
    queryFn: async (): Promise<GoalReminder[]> => {
      const params = (goalId ? { goalId } : {}) as Record<string, string>;
      const response = await apiClient.get<ApiResponse<{ reminders: GoalReminder[] }>>(
        '/goals/reminders',
        params
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to fetch reminders');
      }

      return response.data.data!.reminders;
    },
  });

  const createReminderMutation = useMutation({
    mutationFn: async (data: Partial<GoalReminder> & { goalId: string }) => {
      const response = await apiClient.post<ApiResponse<{ reminder: GoalReminder }>>(
        `/goals/${data.goalId}/reminders`,
        data
      );

      if (response.error || !response.data?.success) {
        throw new Error(response.error || 'Failed to create reminder');
      }

      return response.data.data!.reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.reminders() });
    },
  });

  const deleteReminderMutation = useMutation({
    mutationFn: async ({ goalId, reminderId }: { goalId: string; reminderId: string }) => {
      const response = await apiClient.delete(`/goals/${goalId}/reminders/${reminderId}`);

      if (response.error) {
        throw new Error(response.error);
      }

      return reminderId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.reminders() });
    },
  });

  return {
    reminders: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createReminder: createReminderMutation.mutateAsync,
    deleteReminder: (goalId: string, reminderId: string) =>
      deleteReminderMutation.mutateAsync({ goalId, reminderId }),
    isCreating: createReminderMutation.isPending,
    isDeleting: deleteReminderMutation.isPending,
  };
}

export default useGoals;