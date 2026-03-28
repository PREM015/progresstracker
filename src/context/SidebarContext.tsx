// src/context/SidebarContext.tsx
// Sidebar state management context

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// =============================================================================
// TYPES
// =============================================================================

type SidebarVariant = 'expanded' | 'collapsed' | 'hidden';

interface SidebarContextValue {
  variant: SidebarVariant;
  isExpanded: boolean;
  isCollapsed: boolean;
  isMobileOpen: boolean;
  expand: () => void;
  collapse: () => void;
  toggle: () => void;
  toggleMobile: () => void;
  closeMobile: () => void;
  openMobile: () => void;
  pinnedSections: string[];
  pinSection: (id: string) => void;
  unpinSection: (id: string) => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const SidebarContext = createContext<SidebarContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

const STORAGE_KEY = 'sidebar_variant';

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [variant, setVariant] = useState<SidebarVariant>('expanded');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [pinnedSections, setPinnedSections] = useState<string[]>([]);

  // Restore persisted state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as SidebarVariant | null;
      if (stored) setVariant(stored);
    }
  }, []);

  const persist = (v: SidebarVariant) => {
    setVariant(v);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, v);
  };

  const expand = useCallback(() => persist('expanded'), []);
  const collapse = useCallback(() => persist('collapsed'), []);
  const toggle = useCallback(() => persist(variant === 'expanded' ? 'collapsed' : 'expanded'), [variant]);
  const toggleMobile = useCallback(() => setIsMobileOpen((o) => !o), []);
  const closeMobile = useCallback(() => setIsMobileOpen(false), []);
  const openMobile = useCallback(() => setIsMobileOpen(true), []);

  const pinSection = useCallback((id: string) => {
    setPinnedSections((prev) => [...new Set([...prev, id])]);
  }, []);

  const unpinSection = useCallback((id: string) => {
    setPinnedSections((prev) => prev.filter((s) => s !== id));
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        variant,
        isExpanded: variant === 'expanded',
        isCollapsed: variant === 'collapsed',
        isMobileOpen,
        expand,
        collapse,
        toggle,
        toggleMobile,
        closeMobile,
        openMobile,
        pinnedSections,
        pinSection,
        unpinSection,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within a SidebarProvider');
  return ctx;
}
