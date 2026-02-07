'use client';

import { SessionProvider } from 'next-auth/react';
import { Session } from 'next-auth';

// PROPS INTERFACE:
interface AuthProviderProps {
    children: React.ReactNode;
    session?: Session | null;
}

// PROVIDER COMPONENT:
export function AuthProvider({ children, session }: AuthProviderProps) {
    return (
        <SessionProvider
            session={session}
            // Refetch session every 5 minutes
            refetchInterval={5 * 60}
            // Refetch when window regains focus
            refetchOnWindowFocus={true}
            // Base path for auth API
            basePath="/api/auth"
        >
            {children}
        </SessionProvider>
    );
}
