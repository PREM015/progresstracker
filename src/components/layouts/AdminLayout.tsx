// ============================================================================
// FILE: src/components/layouts/AdminLayout.tsx
// PURPOSE: Admin dashboard layout
// ============================================================================

'use client';

import { Sidebar } from '@/components/navigation/Sidebar';
import { Navbar } from '@/components/navigation/Navbar';
import { useSidebar } from '@/hooks/useSidebar';
import { cn } from '@/lib/utils';
import { ShieldCheck } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="relative flex min-h-screen bg-muted/10">
      {/* Admin Sidebar - could pass 'admin' variant if Sidebar supported it */}
      <Sidebar className="hidden md:fixed md:inset-y-0 md:flex md:flex-col z-50 border-r-destructive/20" />

      {/* Main Content Wrapper */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300",
          isCollapsed ? "md:pl-16" : "md:pl-64"
        )}
      >
        <Navbar variant="dashboard" />

        {/* Admin Banner */}
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 text-xs font-medium text-destructive flex items-center justify-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          Admin Mode Active
        </div>

        <main className="flex-1 p-4 md:p-8 pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}