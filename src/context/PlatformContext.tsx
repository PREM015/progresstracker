// src/context/PlatformContext.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePlatforms } from '@/hooks/usePlatforms';
import { queryKeys } from '@/hooks/keys';
import type { Platform, PlatformConnection } from '@/types/platform';

// Legacy type aliases for backward compatibility
type UserPlatform = PlatformConnection;

interface PlatformContextType {
  platforms: Platform[];
  connectedPlatforms: UserPlatform[];
  isLoading: boolean;
  error: any;
  refetch: () => void;
  connectPlatform: (platformId: string, credentials?: any) => Promise<void>;
  disconnectPlatform: (platformId: string) => Promise<void>;
}

const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { platforms, connectedPlatforms, isLoading, error, connect, disconnect } = usePlatforms();

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.platforms.all });
  }, [queryClient]);

  const connectPlatform = useCallback(
    async (platformId: string, credentials?: any) => {
      await new Promise<void>((resolve, reject) => {
        connect(
          { platformId, data: credentials || {} },
          {
            onSuccess: () => resolve(),
            onError: (err: Error) => reject(err),
          }
        );
      });
    },
    [connect]
  );

  const disconnectPlatform = useCallback(
    async (platformId: string) => {
      await new Promise<void>((resolve, reject) => {
        disconnect(platformId, {
          onSuccess: () => resolve(),
          onError: (err: Error) => reject(err),
        });
      });
    },
    [disconnect]
  );

  return (
    <PlatformContext.Provider
      value={{
        platforms: platforms || [],
        connectedPlatforms: connectedPlatforms || [],
        isLoading,
        error,
        refetch,
        connectPlatform,
        disconnectPlatform,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatformContext() {
  const context = useContext(PlatformContext);
  if (context === undefined) {
    throw new Error('usePlatformContext must be used within PlatformProvider');
  }
  return context;
}