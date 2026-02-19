
import { httpClient } from '@/lib/http-client';
import { PlatformCategory } from '@prisma/client';

export interface Activity {
    id: string;
    date: string;
    category: PlatformCategory;
    notes?: string;
    timeSpent: number;
    tags?: string[];
    [key: string]: any;
}

export interface ActivityStats {
    heatmap: Record<string, { count: number; time: number }>;
    totalActivities: number;
    totalTime: number;
    currentStreak: number;
}

export interface ActivityFilter {
    page?: number;
    limit?: number;
    category?: PlatformCategory;
    startDate?: string;
    endDate?: string;
    search?: string;
}

export const ActivityService = {
    // Get activities
    getActivities: async (filters: ActivityFilter = {}): Promise<Activity[]> => {
        return httpClient.get<Activity[]>('/api/activities', { params: filters as any });
    },

    // Create activity
    createActivity: async (data: any): Promise<Activity> => {
        return httpClient.post<Activity>('/api/activities', data);
    },

    // Update activity
    updateActivity: async (id: string, data: any): Promise<Activity> => {
        return httpClient.put<Activity>(`/api/activities/${id}`, data);
    },

    // Delete activity
    deleteActivity: async (id: string): Promise<void> => {
        await httpClient.delete(`/api/activities/${id}`);
    },

    // Get stats
    getStats: async (): Promise<ActivityStats> => {
        return httpClient.get<ActivityStats>('/api/activities/stats');
    }
};
