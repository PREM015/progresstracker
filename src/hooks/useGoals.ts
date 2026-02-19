/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================================
// FILE: src/hooks/useGoals.ts
// PURPOSE: Goals hook - CRUD, progress tracking, templates
// ============================================================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useCallback, useMemo } from 'react';
import { GoalService } from '@/services/api/goal.service';
import { queryKeys } from './keys';
import type {
  Goal,
  GoalWithProgress,
  GoalTemplate,
  GoalReminder,
  CreateGoalRequest,
  UpdateGoalRequest,
  GoalFilter,
  GoalStatus,
} from '@/types/goal';

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
    queryFn: () => GoalService.getGoals(filters),
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH ACTIVE GOALS
  // ==========================================================================
  const activeQuery = useQuery({
    queryKey: queryKeys.goals.active(),
    queryFn: () => GoalService.getActiveGoals(),
    enabled: isAuthenticated,
    staleTime: 1 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH GOAL STATS
  // ==========================================================================
  const statsQuery = useQuery({
    queryKey: queryKeys.goals.stats(),
    queryFn: () => GoalService.getStats(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // ==========================================================================
  // FETCH TEMPLATES
  // ==========================================================================
  const templatesQuery = useQuery({
    queryKey: queryKeys.goals.templates(),
    queryFn: () => GoalService.getTemplates(),
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // ==========================================================================
  // CREATE GOAL
  // ==========================================================================
  const createMutation = useMutation({
    mutationKey: ['goals', 'create'],
    mutationFn: (data: CreateGoalRequest) => GoalService.createGoal(data),
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
    mutationFn: ({
      templateId,
      overrides
    }: {
      templateId: string;
      overrides?: Partial<CreateGoalRequest>
    }) => GoalService.createFromTemplate(templateId, overrides),
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
    mutationFn: ({
      id,
      data
    }: {
      id: string;
      data: UpdateGoalRequest
    }) => GoalService.updateGoal(id, data),
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
    mutationFn: ({
      id,
      progress
    }: {
      id: string;
      progress: number
    }) => GoalService.updateProgress(id, progress),
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
    mutationFn: (id: string) => GoalService.completeGoal(id),
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
    mutationFn: (id: string) => GoalService.archiveGoal(id),
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
    mutationFn: (id: string) => GoalService.unarchiveGoal(id),
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
    mutationFn: (id: string) => GoalService.pause(id),
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
    mutationFn: (id: string) => GoalService.resume(id),
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
    mutationFn: (id: string) => GoalService.deleteGoal(id),
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
    queryFn: () => GoalService.getGoal(id),
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
    queryFn: () => GoalService.getReminders(goalId),
  });

  const createReminderMutation = useMutation({
    mutationFn: (data: Partial<GoalReminder> & { goalId: string }) => GoalService.createReminder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.reminders() });
    },
  });

  const deleteReminderMutation = useMutation({
    mutationFn: ({ goalId, reminderId }: { goalId: string; reminderId: string }) =>
      GoalService.deleteReminder(goalId, reminderId),
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