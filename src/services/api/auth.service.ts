import { httpClient } from '@/lib/http-client';
import { User } from '@/types/user';

const BASE_URL = '/auth';

export const AuthService = {
    /**
     * Register a new user
     */
    register: async (data: Record<string, any>): Promise<User> => {
        const response = await httpClient.post<{ user: User }>(`${BASE_URL}/register`, data);
        if (!response?.user) throw new Error('User data missing in response');
        return response.user;
    },

    /**
     * Request password reset
     */
    forgotPassword: async (email: string): Promise<void> => {
        await httpClient.post<void>(`${BASE_URL}/forgot-password`, { email });
    },

    /**
     * Reset password
     */
    resetPassword: async (token: string, password: string): Promise<void> => {
        await httpClient.post<void>(`${BASE_URL}/reset-password`, { token, password });
    },

    /**
     * Verify email
     */
    verifyEmail: async (token: string): Promise<void> => {
        await httpClient.post<void>(`${BASE_URL}/verify-email`, { token });
    },

    /**
     * Custom logout
     */
    logoutCustom: async (): Promise<void> => {
        await httpClient.post<void>(`${BASE_URL}/logout-custom`);
    },

    /**
     * Resend verification email
     */
    resendVerification: async (): Promise<void> => {
        await httpClient.post<void>(`${BASE_URL}/resend-verification`);
    },
};
