import { httpClient } from '@/lib/http-client';

export const AdminSupportService = {
    /**
     * Get all support tickets
     */
    getTicketList: async (params?: Record<string, string>): Promise<any> => {
        return await httpClient.get('/api/admin/support-tickets', { params });
    },

    getTickets: async (params?: Record<string, string>): Promise<unknown> => {
        const response = await httpClient.get<{ tickets: unknown }>('/api/admin/support/tickets', { params });
        return response.tickets;
    },
    updateTicket: async (id: string, data: unknown): Promise<unknown> => {
        const response = await httpClient.put<{ ticket: unknown }>(`/api/admin/support/tickets/${id}`, data);
        return response.ticket;
    },
};
