// src/context/PlatformContext.tsx

'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import useSWR from 'swr';

interface Platform {
  id: string;
  name: string;
  category: string;
  logoUrl: string;
  description: string;
  websiteUrl: string;
  apiAvailable: boolean;
  oauthAvailable: boolean;
}

interface UserPlatform {
  id: string;
  platformId: string;
  userId: string;
  isActive: boolean;
  credentials?: any;
  lastSyncedAt?: Date;
  platform: Platform;
}

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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const { data: platformsData, error: platformsError } = useSWR('/api/platforms', fetcher);
  const { data: connectedData, error: connectedError, mutate } = useSWR(
    '/api/platforms/connected',
    fetcher
  );

  const connectPlatform = useCallback(
    async (platformId: string, credentials?: any) => {
      const response = await fetch('/api/platforms/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId, credentials }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect platform');
      }

      await mutate();
    },
    [mutate]
  );

  const disconnectPlatform = useCallback(
    async (platformId: string) => {
      const response = await fetch('/api/platforms/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformId }),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect platform');
      }

      await mutate();
    },
    [mutate]
  );

  const refetch = useCallback(() => {
    mutate();
  }, [mutate]);

  return (
    <PlatformContext.Provider
      value={{
        platforms: platformsData?.platforms || [],
        connectedPlatforms: connectedData?.connectedPlatforms || [],
        isLoading: !platformsData && !platformsError,
        error: platformsError || connectedError,
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