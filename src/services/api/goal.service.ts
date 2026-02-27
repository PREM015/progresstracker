import { httpClient } from '@/lib/http-client';
import { Goal, GoalFilter, CreateGoalRequest, UpdateGoalRequest, GoalStats } from '@/types/goal';

export const GoalService = {
    // Get goals with filtering
    getGoals: async (filters: GoalFilter): Promise<Goal[]> => {
        const params: Record<string, any> = { ...filters };
        const response = await httpClient.get<Goal[]>('/api/goals', { params });
        return response || [];
    },

    // Get a single goal
    getGoal: async (id: string): Promise<Goal> => {
        return httpClient.get<Goal>(`/api/goals/${id}`);
    },

    // Create a goal
    createGoal: async (data: CreateGoalRequest): Promise<Goal> => {
        return httpClient.post<Goal>('/api/goals', data);
    },

    // Update a goal
    updateGoal: async (id: string, data: UpdateGoalRequest): Promise<Goal> => {
        return httpClient.put<Goal>(`/api/goals/${id}`, data);
    },

    // Delete a goal
    deleteGoal: async (id: string): Promise<void> => {
        await httpClient.delete(`/api/goals/${id}`);
    },

    // Get goal statistics
    getStats: async (): Promise<GoalStats> => {
        return httpClient.get<GoalStats>('/api/goals/stats');
    },

    // Toggle goal completion/progress
    updateProgress: async (id: string, progress: number): Promise<Goal> => {
        return httpClient.patch<Goal>(`/api/goals/${id}/progress`, { progress });
    },

    // Get goal templates
    getTemplates: async (): Promise<any[]> => {
        const response = await httpClient.get<any[]>('/api/goals/templates');
        return response || [];
    }
};
