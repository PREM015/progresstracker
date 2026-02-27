'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarStore {
    isOpen: boolean;
    isCollapsed: boolean;
    toggle: () => void;
    toggleCollapse: () => void;
    close: () => void;
    open: () => void;
}

export const useSidebar = create<SidebarStore>()(
    persist(
        (set) => ({
            isOpen: false, // For mobile drawer
            isCollapsed: false, // For desktop sidebar
            toggle: () => set((state) => ({ isOpen: !state.isOpen })),
            toggleCollapse: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
            close: () => set({ isOpen: false }),
            open: () => set({ isOpen: true }),
        }),
        {
            name: 'sidebar-storage',
        }
    )
);
