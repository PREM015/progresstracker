import { httpClient } from '@/lib/http-client';

export const AdminFeedbackService = {
    getFeedback: async (params?: Record<string, string>): Promise<unknown> => {
        const response = await httpClient.get<{ feedback: unknown }>('/api/admin/feedback', { params });
        return response.feedback;
    },
    updateFeedback: async (id: string, data: unknown): Promise<unknown> => {
        const response = await httpClient.put<{ feedback: unknown }>(`/api/admin/feedback/${id}`, data);
        return response.feedback;
    },
};
