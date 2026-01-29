// src/components/layout/MobileMenu.tsx
'use client';

import {  useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
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
} from 'lucide-react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user?: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
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
  { href: '/settings', icon: Settings, label: 'Settings' },
  { href: '/help', icon: HelpCircle, label: 'Help & Support' },
];

export default function MobileMenu({ isOpen, onClose, user }: MobileMenuProps) {
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Menu */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-900 z-50 lg:hidden transform transition-transform duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              Progress Tracker
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <p className="font-semibold text-gray-900 dark:text-white">{user.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto h-[calc(100vh-12rem)]">
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
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}