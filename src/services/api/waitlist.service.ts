import { httpClient } from '@/lib/http-client';
import { WaitlistEntry } from '@/types/waitlist';

const BASE_URL = '/waitlist';

export const WaitlistService = {
    /**
     * Join waitlist
     */
    join: async (email: string, name?: string): Promise<WaitlistEntry> => {
        return httpClient.post<WaitlistEntry>(`${BASE_URL}`, { email, name });
    },

    /**
     * Get waitlist status (if applicable)
     */
    getStatus: async (email: string): Promise<WaitlistEntry> => {
        return httpClient.get<WaitlistEntry>(`${BASE_URL}/status`, { params: { email } });
    }
};
