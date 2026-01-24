// src/hooks/useGoals.ts

import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { 
  Goal, 
  GoalWithProgress, 
  GoalStats, 
  CreateGoalRequest,
  UpdateGoalRequest,
  GoalFilter 
} from '@/types/goal';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface UseGoalsReturn {
  goals: GoalWithProgress[];
  activeGoals: GoalWithProgress[];
  completedGoals: Goal[];
  stats: GoalStats | null;
  isLoading: boolean;
  error: Error | null;
  createGoal: (data: CreateGoalRequest) => Promise<Goal>;
  updateGoal: (id: string, data: UpdateGoalRequest) => Promise<Goal>;
  updateProgress: (id: string, progress: number) => Promise<Goal>;
  incrementProgress: (id: string, increment?: number) => Promise<Goal>;
  deleteGoal: (id: string) => Promise<void>;
  completeGoal: (id: string) => Promise<Goal>;
  refresh: () => Promise<void>;
}

export function useGoals(filter?: GoalFilter): UseGoalsReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Build query string
  const queryParams = new URLSearchParams();
  if (filter?.status) queryParams.set('status', filter.status);
  if (filter?.type) queryParams.set('type', filter.type);
  if (filter?.category) queryParams.set('category', filter.category);
  
  const queryString = queryParams.toString();
  const url = `/api/goals${queryString ? `?${queryString}` : ''}`;

  const { data, error, isLoading } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  const goals = data?.goals || [];
  const stats = data?.stats || null;

  // Active goals
  const activeGoals = goals.filter((g: GoalWithProgress) => g?.status === 'active');
  
  // Completed goals
  const completedGoals = goals.filter((g: GoalWithProgress) => g?.status === 'completed');

  const refresh = useCallback(async () => {
    await mutate(url);
  }, [url]);

  const createGoal = useCallback(async (goalData: CreateGoalRequest): Promise<Goal> => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create goal');
      }

      const goal = await response.json();
      await refresh();
      return goal;
    } finally {
      setIsSubmitting(false);
    }
  }, [refresh]);

  const updateGoal = useCallback(async (
    id: string, 
    goalData: UpdateGoalRequest
  ): Promise<Goal> => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/goals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update goal');
      }

      const goal = await response.json();
      await refresh();
      return goal;
    } finally {
      setIsSubmitting(false);
    }
  }, [refresh]);

  const updateProgress = useCallback(async (
    id: string, 
    progress: number
  ): Promise<Goal> => {
    const response = await fetch(`/api/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update progress');
    }

    const goal = await response.json();
    await refresh();
    return goal;
  }, [refresh]);

  const incrementProgress = useCallback(async (
    id: string, 
    increment: number = 1
  ): Promise<Goal> => {
    const response = await fetch(`/api/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ increment }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to increment progress');
    }

    const goal = await response.json();
    await refresh();
    return goal;
  }, [refresh]);

  const deleteGoal = useCallback(async (id: string): Promise<void> => {
    const response = await fetch(`/api/goals/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete goal');
    }

    await refresh();
  }, [refresh]);

  const completeGoal = useCallback(async (id: string): Promise<Goal> => {
    const goal = goals.find((g: GoalWithProgress) => g.id === id);
    if (goal) {
      return updateProgress(id, goal.target);
    }
    throw new Error('Goal not found');
  }, [goals, updateProgress]);

  return {
    goals,
    activeGoals,
    completedGoals,
    stats,
    isLoading: isLoading || isSubmitting,
    error: error ? new Error(error instanceof Error ? error.message : typeof error === 'string' ? error : 'Failed to load goals') : null,
    createGoal,
    updateGoal,
    updateProgress,
    incrementProgress,
    deleteGoal,
    completeGoal,
    refresh,
  };
}

export default useGoals;