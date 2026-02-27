import { httpClient } from '@/lib/http-client';

export const AdminCommunicationService = {
    /**
     * Get newsletters
     */
    getNewsletters: async (): Promise<any[]> => {
        const response = await httpClient.get<{ newsletters: any[] }>('/api/admin/newsletter');
        return response.newsletters || [];
    },

    /**
     * Get email stats
     */
    getEmailStats: async (): Promise<any> => {
        const response = await httpClient.get<{ stats: any }>('/api/admin/email/stats');
        return response.stats;
    },

    /**
     * Get email templates
     */
    getTemplates: async (): Promise<any[]> => {
        const response = await httpClient.get<{ templates: any[] }>('/api/admin/email/templates');
        return response.templates || [];
    },

    /**
     * Create email template
     */
    createTemplate: async (data: any): Promise<any> => {
        const response = await httpClient.post<{ template: any }>('/api/admin/email/templates', data);
        return response.template;
    },

    /**
     * Update email template
     */
    updateTemplate: async (id: string, data: any): Promise<any> => {
        const response = await httpClient.patch<{ template: any }>(`/api/admin/email/templates/${id}`, data);
        return response.template;
    },

    sendAnnouncement: async (data: unknown): Promise<unknown> => {
        const response = await httpClient.post<{ result: unknown }>('/api/admin/communication/announcement', data);
        return response.result;
    },
    sendEmail: async (data: unknown): Promise<unknown> => {
        const response = await httpClient.post<{ result: unknown }>('/api/admin/communication/email', data);
        return response.result;
    },
};
