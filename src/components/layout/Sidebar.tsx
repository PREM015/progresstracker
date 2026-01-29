/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/layout/Sidebar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Target,
  Award,
  TrendingUp,
  Calendar,
  Settings,
  GitBranch,
  BarChart3,
  FileText,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const menuItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/goals', icon: Target, label: 'Goals' },
  { href: '/achievements', icon: Award, label: 'Achievements' },
  { href: '/activity', icon: TrendingUp, label: 'Activity' },
  { href: '/platforms', icon: GitBranch, label: 'Platforms' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/reports', icon: FileText, label: 'Reports' },
];

const bottomItems = [
  { href: '/settings', icon: Settings, label: 'Settings' },
  { href: '/help', icon: HelpCircle, label: 'Help & Support' },
];

export default function Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 flex flex-col h-[calc(100vh-4rem)] sticky top-16`}
    >
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-6 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-10"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        )}
      </button>

      {/* Main Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {menuItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              title={isCollapsed ? label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span className="font-medium">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Menu */}
      <nav className="px-3 py-4 space-y-1 border-t border-gray-200 dark:border-gray-800">
        {bottomItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              title={isCollapsed ? label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="font-medium">{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}