import { httpClient } from '@/lib/http-client';

// =============================================================================
// TYPES
// =============================================================================

type SubscriptionTier = 'FREE' | 'STARTER' | 'PRO' | 'TEAM' | 'ENTERPRISE';
type SubscriptionStatus = 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED' | 'PAUSED';

export interface Subscription {
    id: string;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    priceAmount: number | null;
    currency: string;
    billingInterval: 'MONTHLY' | 'YEARLY';
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    trialEnd: Date | null;
    platformLimit: number;
    syncFrequencyMinutes: number;
    exportLimitMonthly: number;
    apiRequestsDaily: number;
    currentPlatformCount: number;
    currentExportCount: number;
    features: string[];
}

export interface Plan {
    id: string;
    tier: SubscriptionTier;
    name: string;
    description: string;
    monthlyPrice: number;
    yearlyPrice: number;
    features: string[];
    limits: {
        platforms: number;
        syncFrequency: string;
        exports: number;
        apiRequests: number;
    };
    isPopular: boolean;
}

export interface Invoice {
    id: string;
    invoiceNumber: string | null;
    status: string;
    total: number;
    currency: string;
    invoiceDate: Date;
    paidAt: Date | null;
    invoicePdfUrl: string | null;
}

export interface PaymentMethod {
    id: string;
    type: string;
    brand: string | null;
    last4: string | null;
    expMonth: number | null;
    expYear: number | null;
    isDefault: boolean;
}

export interface UsageData {
    platforms: { used: number; limit: number; percentage: number };
    exports: { used: number; limit: number; percentage: number; resetsAt: Date };
    apiRequests: { used: number; limit: number; percentage: number; resetsAt: Date };
    storage: { used: number; limit: number; percentage: number };
}

// =============================================================================
// SERVICE
// =============================================================================

export const SubscriptionService = {
    /**
     * Get current subscription
     */
    getCurrent: async (): Promise<Subscription> => {
        const response = await httpClient.get<{ subscription: Subscription }>('/api/stripe/subscription');
        return response.subscription;
    },

    /**
     * Get available plans
     */
    getPlans: async (): Promise<Plan[]> => {
        const response = await httpClient.get<{ plans: Plan[] }>('/api/stripe/plans');
        return response.plans;
    },

    /**
     * Get invoices
     */
    getInvoices: async (): Promise<Invoice[]> => {
        const response = await httpClient.get<{ invoices: Invoice[] }>('/api/stripe/invoices');
        return response.invoices;
    },

    /**
     * Get payment methods
     */
    getPaymentMethods: async (): Promise<PaymentMethod[]> => {
        const response = await httpClient.get<{ methods: PaymentMethod[] }>('/api/stripe/payment-methods');
        return response.methods;
    },

    /**
     * Get usage data
     */
    getUsage: async (): Promise<UsageData> => {
        const response = await httpClient.get<{ usage: UsageData }>('/api/stripe/usage');
        return response.usage;
    },

    /**
     * Create checkout session
     */
    createCheckout: async (priceId: string, successUrl?: string, cancelUrl?: string): Promise<{ url: string }> => {
        const response = await httpClient.post<{ url: string }>('/api/stripe/create-checkout', {
            priceId,
            successUrl,
            cancelUrl,
        });
        return response;
    },

    /**
     * Open customer portal
     */
    openCustomerPortal: async (): Promise<{ url: string }> => {
        const response = await httpClient.post<{ url: string }>('/api/stripe/customer-portal');
        return response;
    },

    /**
     * Cancel subscription
     */
    cancel: async (reason?: string): Promise<Subscription> => {
        const response = await httpClient.post<{ subscription: Subscription }>('/api/stripe/cancel', { reason });
        return response.subscription;
    },

    /**
     * Resume subscription
     */
    resume: async (): Promise<Subscription> => {
        const response = await httpClient.post<{ subscription: Subscription }>('/api/stripe/resume');
        return response.subscription;
    },
};
