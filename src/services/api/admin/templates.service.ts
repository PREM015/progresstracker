import { httpClient } from '@/lib/http-client';

export const AdminTemplatesService = {
    /**
     * Get all goal templates
     */
    getGoalTemplates: async (): Promise<any[]> => {
        const response = await httpClient.get<{ templates: any[] }>('/api/admin/goal-templates');
        return response.templates || [];
    },

    /**
     * Create a new goal template
     */
    createGoalTemplate: async (data: any): Promise<any> => {
        const response = await httpClient.post<{ template: any }>('/api/admin/goal-templates', data);
        return response.template;
    },

    /**
     * Update an existing goal template
     */
    updateGoalTemplate: async (id: string, data: any): Promise<any> => {
        const response = await httpClient.patch<{ template: any }>(`/api/admin/goal-templates/${id}`, data);
        return response.template;
    },

    /**
     * Delete a goal template
     */
    deleteGoalTemplate: async (id: string): Promise<void> => {
        await httpClient.delete(`/api/admin/goal-templates/${id}`);
    },

    /**
     * Get a single goal template
     */
    getGoalTemplate: async (id: string): Promise<any> => {
        const response = await httpClient.get<{ template: any }>(`/api/admin/goal-templates/${id}`);
        return response.template;
    },

    /**
     * Get goal template statistics
     */
    getTemplateStats: async (): Promise<any> => {
        const response = await httpClient.get<{ stats: any }>('/api/admin/goal-templates/stats');
        return response.stats;
    },

    getTemplates: async (): Promise<unknown> => {
        const response = await httpClient.get<{ templates: unknown }>('/api/admin/templates');
        return response.templates;
    },
    createTemplate: async (data: unknown): Promise<unknown> => {
        const response = await httpClient.post<{ template: unknown }>('/api/admin/templates', data);
        return response.template;
    },
    updateTemplate: async (id: string, data: unknown): Promise<unknown> => {
        const response = await httpClient.put<{ template: unknown }>(`/api/admin/templates/${id}`, data);
        return response.template;
    },
};
