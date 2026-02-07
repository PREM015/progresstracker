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
  Users,
  BarChart2,
  ListTodo,
  Layers,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/hooks/useSidebar'; // Assuming hook exists, or inline state
// Using inline state for now if hook not present in plan
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { isCollapsed: collapsed, toggleCollapse: setCollapsed } = useSidebar();

  // Navigation items
  const navItems = [
    {
      group: 'Overview',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/tracker', label: 'Tracker', icon: Activity },
        { href: '/goals', label: 'Goals', icon: Target },
      ],
    },
    {
      group: 'Community',
      items: [
        { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
        { href: '/achievements', label: 'Achievements', icon: Layers },
      ],
    },
    {
      group: 'Analytics',
      items: [
        { href: '/analytics', label: 'Analytics', icon: BarChart2 },
        { href: '/reports', label: 'Reports', icon: ListTodo },
      ],
    },
    {
      group: 'Settings',
      items: [
        { href: '/settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        'group flex flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      <div className="flex h-14 items-center border-b px-4 justify-between">
        {!collapsed && <span className="font-semibold text-lg">Menu</span>}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-8 w-8"
          onClick={() => setCollapsed()}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-6 px-2">
          {navItems.map((group, i) => (
            <div key={i}>
              {!collapsed && (
                <h4 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                              isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted text-muted-foreground hover:text-foreground',
                              collapsed && 'justify-center px-2'
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            {!collapsed && <span>{item.label}</span>}
                          </Link>
                        </TooltipTrigger>
                        {collapsed && (
                          <TooltipContent side="right">
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

      <div className="border-t p-4">
        {/* User profile summary or logout could go here */}
      </div>
    </aside>
  );
}
