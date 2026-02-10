// ============================================================================
// FILE: src/components/layouts/DashboardLayout.tsx
// PURPOSE: Main dashboard layout with sidebar
// ============================================================================

'use client';

import { Sidebar } from '@/components/navigation/Sidebar';
import { Navbar } from '@/components/navigation/Navbar';
import { useSidebar } from '@/hooks/useSidebar';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="relative flex min-h-screen">
      {/* Sidebar - fixed position on desktop */}
      <Sidebar className="hidden md:fixed md:inset-y-0 md:flex md:flex-col z-50" />

      {/* Main Content Wrapper */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300",
          isCollapsed ? "md:pl-16" : "md:pl-64"
        )}
      >
        <Navbar variant="dashboard" />
        <main className="flex-1 p-4 md:p-8 pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
