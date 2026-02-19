import { httpClient } from '@/lib/http-client';
import { SupportTicket, CreateTicketRequest, FeedbackRequest, ContactRequest } from '@/types/support';

const BASE_URL = '/support';

export const SupportService = {
    /**
     * Get all support tickets
     */
    getTickets: async (): Promise<SupportTicket[]> => {
        const response = await httpClient.get<SupportTicket[]>(`${BASE_URL}/tickets`);
        return response || [];
    },

    /**
     * Get a single ticket
     */
    getTicket: async (id: string): Promise<SupportTicket> => {
        return httpClient.get<SupportTicket>(`${BASE_URL}/tickets/${id}`);
    },

    /**
     * Create a new ticket
     */
    createTicket: async (data: CreateTicketRequest): Promise<SupportTicket> => {
        return httpClient.post<SupportTicket>(`${BASE_URL}/tickets`, data);
    },

    /**
     * Submit feedback
     */
    submitFeedback: async (data: FeedbackRequest): Promise<void> => {
        await httpClient.post<void>(`${BASE_URL}/feedback`, data);
    },

    /**
     * Submit contact form
     */
    submitContact: async (data: ContactRequest): Promise<void> => {
        await httpClient.post<void>(`${BASE_URL}/contact`, data);
    },
};
