// ============================================================================
// FILE: src/components/providers/AuthProvider.tsx
// PURPOSE: NextAuth session provider wrapper
// ============================================================================

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
            // Refetch session every 10 minutes (600s) to reduce load, or 0 to disable auto-polling
            refetchInterval={600}
            // Disable refetch on window focus to prevent "10-15 calls" issue
            refetchOnWindowFocus={false}
            // Base path for auth API
            basePath="/api/auth"
        >
            {children}
        </SessionProvider>
    );
}
