import useSWR from 'swr';
import axios from 'axios';
import { useToast } from './useToast';

interface Goal {
  id: string;
  userId: string;
  title: string;
  target: number;
  progress: number;
  deadline?: Date;
  createdAt: Date;
  completedAt?: Date;
}

interface CreateGoalData {
  title: string;
  target: number;
  deadline?: Date;
}

interface UpdateGoalData {
  title?: string;
  target?: number;
  progress?: number;
  deadline?: Date;
}

export function useGoals() {
  const { toast } = useToast();

  const {
    data,
    error,
    mutate,
    isLoading,
  } = useSWR<{ goals: Goal[] }>(
    '/api/goals',
    async (url) => {
      const response = await axios.get(url);
      return response.data;
    },
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  // Create new goal
  const createGoal = async (goalData: CreateGoalData) => {
    try {
      const response = await axios.post('/api/goals', goalData);
      await mutate();
      toast({
        title: 'Goal created',
        description: 'Your new goal has been set!',
        variant: 'success',
      });
      return response.data.goal;
    } catch (error: any) {
      toast({
        title: 'Failed to create goal',
        description: error.response?.data?.error || 'Please try again.',
        variant: 'error',
      });
      throw error;
    }
  };

  // Update goal
  const updateGoal = async (id: string, data: UpdateGoalData) => {
    try {
      const response = await axios.put(`/api/goals/${id}`, data);
      await mutate();
      toast({
        title: 'Goal updated',
        description: 'Your changes have been saved.',
        variant: 'success',
      });
      return response.data.goal;
    } catch (error: any) {
      toast({
        title: 'Failed to update goal',
        description: error.response?.data?.error || 'Please try again.',
        variant: 'error',
      });
      throw error;
    }
  };

  // Delete goal
  const deleteGoal = async (id: string) => {
    try {
      await axios.delete(`/api/goals/${id}`);
      await mutate();
      toast({
        title: 'Goal deleted',
        description: 'The goal has been removed.',
        variant: 'success',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to delete goal',
        description: error.response?.data?.error || 'Please try again.',
        variant: 'error',
      });
      throw error;
    }
  };

  // Complete goal
  const completeGoal = async (id: string) => {
    try {
      const response = await axios.put(`/api/goals/${id}`, {
        completedAt: new Date().toISOString(),
      });
      await mutate();
      toast({
        title: 'Goal completed! 🎉',
        description: 'Congratulations on achieving your goal!',
        variant: 'success',
        duration: 7000,
      });
      return response.data.goal;
    } catch (error: any) {
      toast({
        title: 'Failed to complete goal',
        description: error.response?.data?.error || 'Please try again.',
        variant: 'error',
      });
      throw error;
    }
  };

  // Update progress
  const updateProgress = async (id: string, progress: number) => {
    try {
      const response = await axios.put(`/api/goals/${id}`, { progress });
      await mutate();
      return response.data.goal;
    } catch (error: any) {
      toast({
        title: 'Failed to update progress',
        description: error.response?.data?.error || 'Please try again.',
        variant: 'error',
      });
      throw error;
    }
  };

  return {
    goals: data?.goals || [],
    isLoading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    completeGoal,
    updateProgress,
    refresh: mutate,
  };
}

// Hook to get active goals only
export function useActiveGoals() {
  const { goals, isLoading, error } = useGoals();

  const activeGoals = goals.filter((goal) => !goal.completedAt);

  return {
    goals: activeGoals,
    isLoading,
    error,
  };
}

// Hook to get completed goals only
export function useCompletedGoals() {
  const { goals, isLoading, error } = useGoals();

  const completedGoals = goals.filter((goal) => goal.completedAt);

  return {
    goals: completedGoals,
    isLoading,
    error,
  };
}