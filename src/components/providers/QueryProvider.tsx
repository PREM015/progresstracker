'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

// QUERY CLIENT CONFIGURATION:
const createQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            // Data freshness
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)

            // Retry configuration
            retry: (failureCount, error) => {
                // Don't retry on 4xx errors
                if (error instanceof Error && error.message.includes('4')) {
                    return false;
                }
                return failureCount < 3;
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

            // Refetch behavior
            refetchOnWindowFocus: false, // Disable by default
            refetchOnReconnect: true,
            refetchOnMount: true,

            // Network mode
            networkMode: 'offlineFirst',
        },
        mutations: {
            retry: 1,
            networkMode: 'offlineFirst',
        },
    },
});

// PROVIDER COMPONENT:
export function QueryProvider({ children }: { children: React.ReactNode }) {
    // Create client inside component to avoid shared state in SSR
    const [queryClient] = useState(() => createQueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools initialIsOpen={false} position="bottom" />
            )}
        </QueryClientProvider>
    );
}
