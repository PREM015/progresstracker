// ============================================================================
// FILE: src/components/navigation/Sidebar.tsx
// PURPOSE: Premium glassmorphism sidebar with active glow effects
// ============================================================================

'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Target,
  Trophy,
  Activity,
  Settings,
  BarChart2,
  ListTodo,
  Layers,
  ChevronLeft,
  ChevronRight,
  Bell,
  HelpCircle,
  User,
  Code,
  Github,
  Briefcase,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/hooks/useSidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DASHBOARD_ROUTES, SETTINGS_ROUTES } from '@/constants/routes';
import { motion } from 'framer-motion';


interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { isCollapsed: collapsed, toggleCollapse: setCollapsed } = useSidebar();

  const navItems = [
    {
      group: 'Overview',
      items: [
        { href: DASHBOARD_ROUTES.HOME, label: 'Dashboard', icon: LayoutDashboard },
        { href: DASHBOARD_ROUTES.TRACKER, label: 'Tracker', icon: Activity },
        { href: DASHBOARD_ROUTES.GOALS, label: 'Goals', icon: Target },
      ],
    },
    {
      group: 'Platforms',
      items: [
        { href: DASHBOARD_ROUTES.PLATFORMS, label: 'All Platforms', icon: Layers },
        { href: `${DASHBOARD_ROUTES.PLATFORMS}?category=dsa`, label: 'Coding Platforms', icon: Code },
        { href: `${DASHBOARD_ROUTES.PLATFORMS}?category=git`, label: 'Git Platforms', icon: Github },
        { href: `${DASHBOARD_ROUTES.PLATFORMS}?category=job`, label: 'Job Boards', icon: Briefcase },
      ],
    },
    {
      group: 'Community',
      items: [
        { href: DASHBOARD_ROUTES.LEADERBOARD, label: 'Leaderboard', icon: Trophy },
        { href: DASHBOARD_ROUTES.ACHIEVEMENTS, label: 'Achievements', icon: Zap },
      ],
    },
    {
      group: 'Analytics',
      items: [
        { href: DASHBOARD_ROUTES.ANALYTICS, label: 'Analytics', icon: BarChart2 },
        { href: DASHBOARD_ROUTES.REPORTS, label: 'Reports', icon: ListTodo },
      ],
    },
    {
      group: 'Support & Settings', // Renamed from Configuration
      items: [
        { href: DASHBOARD_ROUTES.PROFILE, label: 'Profile', icon: User },
        { href: DASHBOARD_ROUTES.NOTIFICATIONS, label: 'Notifications', icon: Bell },
        { href: DASHBOARD_ROUTES.SUPPORT, label: 'Support', icon: HelpCircle },
        { href: SETTINGS_ROUTES.ACCOUNT, label: 'Settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        'group flex flex-col h-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-r border-zinc-200 dark:border-zinc-800 transition-all duration-300 relative z-50',
        collapsed ? 'w-20' : 'w-72',
        className
      )}
    >
      {/* Glow Effect behind sidebar */}
      <div className="absolute -z-10 top-0 left-0 w-full h-full bg-gradient-to-b from-indigo-500/5 via-purple-500/5 to-transparent opacity-50" />

      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-zinc-200/50 dark:border-zinc-800/50">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-50">
              Progress<span className="text-indigo-600 dark:text-indigo-400">Tracker</span>
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all",
            collapsed && "mx-auto"
          )}
          onClick={() => setCollapsed()}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-3 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
        <nav className="space-y-6">
          {navItems.map((group, i) => (
            <div key={i}>
              {!collapsed && (
                <h4 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {group.group}
                </h4>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;

                  return (
                    <TooltipProvider key={item.href} delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group/item overflow-hidden',
                              isActive
                                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-900',
                              collapsed && 'justify-center px-2'
                            )}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="active-sidebar-pill"
                                className="absolute inset-0 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl"
                                initial={false}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                              />
                            )}
                            {isActive && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 dark:bg-indigo-400 rounded-r-full" />
                            )}

                            <Icon className={cn("relative z-10 h-5 w-5 shrink-0 transition-colors", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 group-hover/item:text-zinc-600 dark:group-hover/item:text-zinc-300")} />
                            {!collapsed && <span className="relative z-10">{item.label}</span>}
                          </Link>
                        </TooltipTrigger>
                        {collapsed && (
                          <TooltipContent side="right" className="bg-zinc-900 text-zinc-50 border-zinc-800 font-medium">
                            {item.label}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-zinc-200/50 dark:border-zinc-800/50">
          <div className="px-3 py-2 text-[10px] font-semibold text-zinc-400 dark:text-zinc-600 uppercase tracking-widest">
            ProgressTracker v1.0
          </div>
        </div>
      )}
    </aside>
  );
}
