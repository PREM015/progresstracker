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
    <div className="relative flex min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      {/* 
        Clean, subtle background. 
        Removed colored blobs for a professional SaaS look.
        Added extremely subtle noise for texture if desired, or kept flat.
      */}

      {/* Floating Sidebar - Fixed on desktop */}
      <div className="hidden md:block fixed inset-y-0 left-0 z-50 h-full border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <Sidebar className="h-full" />
      </div>

      {/* Main Content Wrapper */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300 relative z-10",
          isCollapsed ? "md:pl-20" : "md:pl-72"
        )}
      >
        <Navbar variant="dashboard" className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800" />

        <main className="flex-1 p-6 md:p-8 pt-6 overflow-x-hidden w-full max-w-[1600px] mx-auto">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
