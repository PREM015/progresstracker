import { httpClient } from '@/lib/http-client';
import { ReferralCode, ReferralStats } from '@/types/referral';

const BASE_URL = '/referral';

export const ReferralService = {
    /**
     * Get my referral code
     */
    getCode: async (): Promise<ReferralCode> => {
        return httpClient.get<ReferralCode>(`${BASE_URL}/code`);
    },

    /**
     * Create/Generate referral code
     */
    createCode: async (): Promise<ReferralCode> => {
        return httpClient.post<ReferralCode>(`${BASE_URL}/code`);
    },

    /**
     * Get referral stats
     */
    getStats: async (): Promise<ReferralStats> => {
        return httpClient.get<ReferralStats>(`${BASE_URL}/stats`);
    },

    /**
     * Validate a code
     */
    validateCode: async (code: string): Promise<boolean> => {
        const response = await httpClient.post<{ valid: boolean }>(`${BASE_URL}/validate`, { code });
        return response?.valid || false;
    }
};
