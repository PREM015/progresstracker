// src/context/FeatureFlagContext.tsx
// Feature flag context for client-side flag checking

'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

interface FeatureFlags {
  [key: string]: boolean;
}

interface FeatureFlagContextValue {
  flags: FeatureFlags;
  isEnabled: (flagKey: string) => boolean;
  setFlag: (key: string, value: boolean) => void;
  setFlags: (flags: FeatureFlags) => void;
  refreshFlags: () => Promise<void>;
}

// =============================================================================
// CONTEXT
// =============================================================================

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface FeatureFlagProviderProps {
  children: React.ReactNode;
  initialFlags?: FeatureFlags;
}

export function FeatureFlagProvider({ children, initialFlags = {} }: FeatureFlagProviderProps) {
  const [flags, setFlags] = useState<FeatureFlags>(initialFlags);

  const isEnabled = useCallback(
    (flagKey: string): boolean => {
      return flags[flagKey] ?? false;
    },
    [flags]
  );

  const setFlag = useCallback((key: string, value: boolean) => {
    setFlags((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setAllFlags = useCallback((newFlags: FeatureFlags) => {
    setFlags(newFlags);
  }, []);

  const refreshFlags = useCallback(async () => {
    try {
      const response = await fetch('/api/feature-flags');
      if (response.ok) {
        const data = await response.json();
        if (data?.data?.flags) {
          setFlags(data.data.flags);
        }
      }
    } catch {
      // Silently fail — use existing flags
    }
  }, []);

  return (
    <FeatureFlagContext.Provider
      value={{ flags, isEnabled, setFlag, setFlags: setAllFlags, refreshFlags }}
    >
      {children}
    </FeatureFlagContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useFeatureFlags(): FeatureFlagContextValue {
  const ctx = useContext(FeatureFlagContext);
  if (!ctx) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return ctx;
}

export function useFeatureFlag(flagKey: string): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(flagKey);
}
